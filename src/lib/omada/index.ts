export { omadaRequest } from "@/lib/omada/client";
export { getOmadaCloudAccount, isOmadaCloudConfigured, controllerApiBase } from "@/lib/omada/config";
export { withOmadaController, locationOmadaController } from "@/lib/omada/context";
export { getSites, getLoginStatus, resolveHotspotSiteId, testOmadaConnection } from "@/lib/omada/sites";
export { findHotspotVoucherByCode, findHotspotVouchersByCodes } from "@/lib/omada/lookup";
export {
  getCurrentUser,
  getConnectedClients,
  listVoucherGroups,
  getVoucherGroup,
  listHotspotVouchers,
  listVouchersInGroup,
  listVoucherPortals,
  createVoucherGroup,
  createHotspotVouchers,
  deleteVoucherGroup,
} from "@/lib/omada/operations";
export {
  buildOmadaVoucherCreateBody,
  extractCreatedId,
  extractCreatedVoucher,
  extractOmadaVoucherFacts,
} from "@/lib/omada/vouchers";
export * from "@/lib/omada/types";
export * from "@/lib/omada/errors";
