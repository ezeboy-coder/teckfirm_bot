import { describe, expect, it } from "vitest";
import { isOmadaControllerIp } from "@/lib/utils/ip";

describe("omada controller IP", () => {
  it("accepts IPv4 with an optional port", () => {
    expect(isOmadaControllerIp("192.168.1.10")).toBe(true);
    expect(isOmadaControllerIp("10.0.0.1:8043")).toBe(true);
  });

  it("rejects invalid hosts", () => {
    expect(isOmadaControllerIp("192.168.1.256")).toBe(false);
    expect(isOmadaControllerIp("controller.local")).toBe(false);
    expect(isOmadaControllerIp("10.0.0.1:99999")).toBe(false);
  });
});
