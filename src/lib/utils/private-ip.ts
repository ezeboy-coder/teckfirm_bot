const PRIVATE_V4 =
  /^(?:10\.|127\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])\.)/;

export function isPrivateIpv4(hostname: string): boolean {
  return hostname === "localhost" || PRIVATE_V4.test(hostname);
}

export function isOmadaCloudWebsite(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "omada.tplinkcloud.com" || host.endsWith("-omada-cloud.tplinkcloud.com");
}
