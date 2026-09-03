import { omadaRequest } from "@/lib/omada/client";
import { OmadaError } from "@/lib/omada/errors";
import { extractSiteList } from "@/lib/omada/parse";
import type { OmadaConnectionTest, OmadaSite } from "@/lib/omada/types";

export async function getSites(): Promise<OmadaSite[]> {
  const payload = await omadaRequest<unknown>("GET", "/sites?currentPage=1&currentPageSize=50");
  return extractSiteList(payload);
}

export async function resolveHotspotSiteId(location: {
  omadaSiteId: string | null;
  name: string;
}): Promise<string> {
  const stored = location.omadaSiteId?.trim();
  if (stored) return stored;

  const sites = await getSites();
  const preferred =
    sites.find((site) => site.name.toLowerCase() === "default") ??
    sites.find((site) => site.name.toLowerCase() === location.name.toLowerCase()) ??
    sites[0];

  if (!preferred) {
    throw new OmadaError("No Omada hotspot site is available.", "OMADA_NO_SITE", true);
  }

  return preferred.id;
}

export async function getLoginStatus(): Promise<unknown> {
  return omadaRequest("GET", "/current/user");
}

export async function testOmadaConnection(): Promise<OmadaConnectionTest> {
  await getLoginStatus();
  const sites = await getSites();
  return {
    connected: true,
    siteCount: sites.length,
    sites,
  };
}
