import { omadaRequest } from "@/lib/omada/client";

function siteSegment(siteId: string): string {
  return encodeURIComponent(siteId);
}

/** GET /users/current — confirmed Web API v2. */
export function getCurrentUser(): Promise<unknown> {
  return omadaRequest("GET", "/users/current");
}

/** GET /clients — confirmed Web API v2 list with paging. */
export function getConnectedClients(): Promise<unknown> {
  return omadaRequest("GET", "/clients?currentPage=1&currentPageSize=50");
}

/**
 * Hotspot voucher groups on the OC200 web API
 * (`/hotspot/sites/{siteId}/voucherGroups`).
 */
export function listVoucherGroups(siteId: string, page = 1, pageSize = 50): Promise<unknown> {
  return omadaRequest(
    "GET",
    `/hotspot/sites/${siteSegment(siteId)}/voucherGroups?currentPage=${page}&currentPageSize=${pageSize}`,
  );
}

export function getVoucherGroup(
  siteId: string,
  groupId: string,
  page = 1,
  pageSize = 50,
): Promise<unknown> {
  return omadaRequest(
    "GET",
    `/hotspot/sites/${siteSegment(siteId)}/voucherGroups/${encodeURIComponent(groupId)}?currentPage=${page}&currentPageSize=${pageSize}`,
  );
}

/**
 * Hotspot vouchers on the OC200 web API.
 * Confirmed list path is GET on the same resource as POST `/vouchers`.
 */
export function listHotspotVouchers(siteId: string, page = 1, pageSize = 50): Promise<unknown> {
  return omadaRequest(
    "GET",
    `/hotspot/sites/${siteSegment(siteId)}/vouchers?currentPage=${page}&currentPageSize=${pageSize}`,
  );
}

export function listVouchersInGroup(siteId: string, groupId: string): Promise<unknown> {
  return getVoucherGroup(siteId, groupId);
}

export function createVoucherGroup(siteId: string, body: unknown): Promise<unknown> {
  return omadaRequest("POST", `/hotspot/sites/${siteSegment(siteId)}/voucherGroups`, body);
}

/**
 * Hotspot portals that a voucher can be bound to
 * (`GET /hotspot/sites/{siteId}/setting/voucher/portals`).
 */
export function listVoucherPortals(siteId: string): Promise<unknown> {
  return omadaRequest("GET", `/hotspot/sites/${siteSegment(siteId)}/setting/voucher/portals`);
}

/**
 * Create hotspot vouchers on the OC200 web API
 * (`POST /hotspot/sites/{siteId}/vouchers`). Confirmed list path is GET on the same resource.
 */
export function createHotspotVouchers(siteId: string, body: unknown): Promise<unknown> {
  return omadaRequest("POST", `/hotspot/sites/${siteSegment(siteId)}/vouchers`, body);
}

export function deleteVoucherGroup(siteId: string, groupId: string): Promise<unknown> {
  return omadaRequest(
    "DELETE",
    `/hotspot/sites/${siteSegment(siteId)}/voucherGroups/${encodeURIComponent(groupId)}`,
  );
}
