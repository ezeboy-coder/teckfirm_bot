import { describe, expect, it } from "vitest";
import { locationDisplayName } from "@/lib/locations/label";

describe("location display name", () => {
  it("uses the community name on its own", () => {
    expect(locationDisplayName("COMMUNITY", "Gbagada")).toBe("Gbagada");
  });

  it("joins community and lodge", () => {
    expect(locationDisplayName("COMMUNITY_AND_LODGE", "Gbagada", "Lodge A")).toBe("Gbagada / Lodge A");
  });
});
