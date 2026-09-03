import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/utils/slug";

describe("slugify", () => {
  it("turns a hotspot name into a url slug", () => {
    expect(slugify("TeckFirm Wuse Hotspot")).toBe("teckfirm-wuse-hotspot");
  });

  it("falls back when the name has no letters", () => {
    expect(slugify("***")).toBe("location");
  });
});
