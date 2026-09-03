const IPV4 =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

/** IPv4, optionally with a TCP port, for Omada controller hosts. */
export function isOmadaControllerIp(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes(" ")) return false;

  const parts = trimmed.split(":");
  if (parts.length > 2) return false;

  const host = parts[0];
  if (!host || !IPV4.test(host)) return false;

  if (parts.length === 1) return true;

  const port = Number(parts[1]);
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}
