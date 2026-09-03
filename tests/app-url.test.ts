import { describe, expect, it } from "vitest";
import { toAbsoluteAppUrl } from "@/lib/utils/app-url";

describe("toAbsoluteAppUrl", () => {
  it("adds https for a bare production host", () => {
    expect(toAbsoluteAppUrl("bot.teckfirm.org")).toBe("https://bot.teckfirm.org");
  });

  it("keeps an existing absolute URL", () => {
    expect(toAbsoluteAppUrl("https://bot.teckfirm.org/")).toBe("https://bot.teckfirm.org");
  });

  it("uses http for localhost without a protocol", () => {
    expect(toAbsoluteAppUrl("localhost:3000")).toBe("http://localhost:3000");
  });
});
