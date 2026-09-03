import { OmadaError } from "@/lib/omada/errors";
import { getVoucherGroup, listHotspotVouchers, listVoucherGroups } from "@/lib/omada/operations";
import { extractIdRows, extractPagedVoucherRows } from "@/lib/omada/parse";
import { voucherRowCode } from "@/lib/omada/vouchers";

const PAGE_SIZE = 50;
const MAX_PAGES = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function collectMatchingRows(
  loadPage: (page: number) => Promise<unknown>,
  remaining: Set<string>,
  found: Map<string, Record<string, unknown>>,
): Promise<void> {
  for (let page = 1; page <= MAX_PAGES && remaining.size > 0; page += 1) {
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
