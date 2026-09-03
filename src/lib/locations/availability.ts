export const LOCATION_CONTROLLER_OFFLINE_MESSAGE =
  "This location is currently not active. You can’t buy WiFi, check a voucher, or view voucher details here right now.";

export function isLocationListedForGuests(location: { active: boolean } | null): boolean {
  return Boolean(location?.active);
}
