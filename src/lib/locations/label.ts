export type LocationKindValue = "COMMUNITY" | "COMMUNITY_AND_LODGE";

export function locationDisplayName(
  kind: LocationKindValue,
  community: string,
  lodgeName?: string | null,
): string {
  const communityName = community.trim();
  const lodge = lodgeName?.trim();
  if (kind === "COMMUNITY_AND_LODGE" && lodge) {
    return `${communityName} / ${lodge}`;
  }
  return communityName;
}

export function locationKindLabel(kind: LocationKindValue): string {
  return kind === "COMMUNITY_AND_LODGE" ? "Community and lodges" : "Community";
}
