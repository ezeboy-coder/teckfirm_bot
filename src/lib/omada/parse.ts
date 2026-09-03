import type { OmadaPortal, OmadaSite } from "@/lib/omada/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNamedId(value: unknown): { id: string; name: string } | null {
  if (!isRecord(value)) return null;
  const id = value.id ?? value.siteId ?? value.portalId;
  const name = value.name ?? value.siteName ?? value.portalName;
  if (typeof id !== "string" || typeof name !== "string") return null;
  return { id, name };
}

export function extractSiteList(payload: unknown): OmadaSite[] {
  if (Array.isArray(payload)) {
    return payload.map(readNamedId).filter((site): site is OmadaSite => site !== null);
  }

  if (!isRecord(payload)) return [];

  const nested = payload.data ?? payload.list ?? payload.sites;
  if (Array.isArray(nested)) {
    return nested.map(readNamedId).filter((site): site is OmadaSite => site !== null);
  }

  return [];
}

function collectPortalRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  const nested = payload.data ?? payload.list ?? payload.portals;
  return Array.isArray(nested) ? nested : [];
}

export function extractPortalList(payload: unknown): OmadaPortal[] {
  return collectPortalRows(payload)
    .map(readNamedId)
    .filter((portal): portal is OmadaPortal => portal !== null);
}

function collectVoucherRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  const nested = payload.data ?? payload.list ?? payload.vouchers ?? payload.voucherList;
  return Array.isArray(nested) ? nested : [];
}

function readPositiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function extractIdRows(payload: unknown): { id: string; name: string }[] {
  const rows = collectVoucherRows(payload);
  return rows
    .map((row) => {
      if (!isRecord(row)) return null;
      const id = row.id ?? row.groupId;
      if (typeof id !== "string" || !id.trim()) return null;
      const name = typeof row.name === "string" ? row.name : "";
      return { id: id.trim(), name };
    })
    .filter((row): row is { id: string; name: string } => row !== null);
}

export function extractPagedVoucherRows(payload: unknown): { rows: unknown[]; hasMore: boolean } {
  const rows = collectVoucherRows(payload);
  if (!isRecord(payload)) {
    return { rows, hasMore: rows.length >= 50 };
  }

  const currentPage = readPositiveInt(payload.currentPage) ?? 1;
  const totalPage = readPositiveInt(payload.totalPage);
  if (totalPage != null) {
    return { rows, hasMore: currentPage < totalPage };
  }

  const pageSize = readPositiveInt(payload.currentPageSize) ?? 50;
  return { rows, hasMore: rows.length >= pageSize };
}
