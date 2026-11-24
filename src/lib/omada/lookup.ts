import { OmadaError } from "@/lib/omada/errors";
import { getVoucherGroup, listHotspotVouchers, listVoucherGroups } from "@/lib/omada/operations";
import { extractIdRows, extractPagedVoucherRows } from "@/lib/omada/parse";
import { findVoucherRowByCode, voucherRowCode } from "@/lib/omada/vouchers";

const PAGE_SIZE = 50;
const MAX_PAGES = 20;
const LIVE_PAGE_SIZE = 100;
const LIVE_MAX_PAGES = 5;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function collectMatchingRows(
  loadPage: (page: number) => Promise<unknown>,
  remaining: Set<string>,
  found: Map<string, Record<string, unknown>>,
  maxPages = MAX_PAGES,
): Promise<void> {
  for (let page = 1; page <= maxPages && remaining.size > 0; page += 1) {
    const { rows, hasMore } = extractPagedVoucherRows(await loadPage(page));
    for (const row of rows) {
      const code = voucherRowCode(row);
      if (!code || !remaining.has(code) || !isRecord(row)) continue;
      found.set(code, row);
      remaining.delete(code);
    }
    if (!hasMore) break;
  }
}

function isMissingOnController(error: OmadaError) {
  return error.code === "OMADA_REQUEST_FAILED" && !error.retryable;
}

function rowFromGroupPayload(payload: unknown, code: string): Record<string, unknown> | null {
  const rows = extractPagedVoucherRows(payload).rows;
  const matched = findVoucherRowByCode(rows, code);
  if (matched) return matched;
  if (isRecord(payload) && voucherRowCode(payload) === code) {
    return payload;
  }
  return null;
}

/**
 * Live unused/in-use vouchers only. Does not scan voucher groups, so a code that
 * no longer exists returns quickly instead of paging the whole controller.
 */
export async function findLiveHotspotVoucher(
  siteId: string,
  input: { code: string; omadaVoucherId?: string | null },
): Promise<Record<string, unknown> | null> {
  const code = input.code.trim();
  if (!code) return null;

  const groupId = input.omadaVoucherId?.trim();
  if (groupId) {
    try {
      const row = rowFromGroupPayload(await getVoucherGroup(siteId, groupId), code);
      if (row) return row;
    } catch (error) {
      if (!(error instanceof OmadaError && isMissingOnController(error))) {
        throw error;
      }
    }
  }

  const remaining = new Set([code]);
  const found = new Map<string, Record<string, unknown>>();
  await collectMatchingRows(
    (page) => listHotspotVouchers(siteId, page, LIVE_PAGE_SIZE),
    remaining,
    found,
    LIVE_MAX_PAGES,
  );
  return found.get(code) ?? null;
}

export async function findHotspotVoucherByCode(
  siteId: string,
  code: string,
): Promise<Record<string, unknown> | null> {
  const matches = await findHotspotVouchersByCodes(siteId, [code]);
  return matches.get(code.trim()) ?? null;
}

export async function findHotspotVouchersByCodes(
  siteId: string,
  codes: string[],
): Promise<Map<string, Record<string, unknown>>> {
  const remaining = new Set(codes.map((code) => code.trim()).filter(Boolean));
  const found = new Map<string, Record<string, unknown>>();
  if (remaining.size === 0) return found;

  try {
    await collectMatchingRows((page) => listHotspotVouchers(siteId, page, PAGE_SIZE), remaining, found);
  } catch (error) {
    if (!(error instanceof OmadaError)) {
      throw error;
    }
  }

  if (remaining.size === 0) return found;

  for (let page = 1; page <= MAX_PAGES && remaining.size > 0; page += 1) {
    const payload = await listVoucherGroups(siteId, page, PAGE_SIZE);
    const groups = extractIdRows(payload);
    for (const group of groups) {
      if (remaining.size === 0) break;
      await collectMatchingRows(
        (groupPage) => getVoucherGroup(siteId, group.id, groupPage, PAGE_SIZE),
        remaining,
        found,
      );
    }
    if (!extractPagedVoucherRows(payload).hasMore && groups.length < PAGE_SIZE) {
      break;
    }
  }

  return found;
}
