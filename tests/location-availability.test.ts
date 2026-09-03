import { describe, expect, it } from "vitest";
import {
  isLocationListedForGuests,
  LOCATION_CONTROLLER_OFFLINE_MESSAGE,
} from "@/lib/locations/availability";

describe("location guest availability", () => {
  it("lists a location for guests only when it is active", () => {
    expect(isLocationListedForGuests({ active: true })).toBe(true);
    expect(isLocationListedForGuests({ active: false })).toBe(false);
    expect(isLocationListedForGuests(null)).toBe(false);
  });

  it("explains that an unreachable controller cannot be used", () => {
    expect(LOCATION_CONTROLLER_OFFLINE_MESSAGE).toContain("not active");
  });
});
