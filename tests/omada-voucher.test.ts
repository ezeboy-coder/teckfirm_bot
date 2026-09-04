import { describe, expect, it } from "vitest";
import { extractPagedVoucherRows } from "@/lib/omada/parse";
import {
  OMADA_TRAFFIC_LIMIT_TOTAL,
  buildOmadaVoucherCreateBody,
  extractCreatedId,
  extractCreatedVoucher,
  extractOmadaVoucherFacts,
  findVoucherRowByCode,
  omadaVoucherStatusLabel,
} from "@/lib/omada/vouchers";

describe("Omada voucher group create payload", () => {
  it("creates one limited-usage voucher matching the selected plan", () => {
    expect(
      buildOmadaVoucherCreateBody({
        name: "TFW-TEST",
        durationMinutes: 1440,
        deviceLimit: 2,
        dataAllowanceMb: 2048,
        speedLimitKbps: 10240,
        note: "TFW-TEST",
      }),
    ).toEqual({
      name: "TFW-TEST",
      codeLength: 6,
      codeForm: [0],
      amount: 1,
      type: 0,
      logout: true,
      duration: 1440,
      durationType: 1,
      maxUsers: 2,
      trafficLimitFrequency: OMADA_TRAFFIC_LIMIT_TOTAL,
      applyToAllPortals: true,
      validityType: 0,
      voucherValidityEnable: false,
      upTimeLimitEnable: false,
      downLimitEnable: true,
      upLimitEnable: true,
      trafficLimitEnable: true,
      upLimit: 10240,
      downLimit: 10240,
      trafficLimit: 2048,
      description: "TFW-TEST",
    });
  });

  it("uses Omada unlimited-user type for gig plans with unlimited devices", () => {
    const body = buildOmadaVoucherCreateBody({
      name: "TFW-GIG",
      durationMinutes: 43200,
      deviceLimit: 999,
      dataAllowanceMb: 2048,
      speedLimitKbps: null,
    });
    expect(body.type).toBe(2);
    expect(body.maxUsers).toBe(999);
    expect(body.trafficLimit).toBe(2048);
    expect(body.trafficLimitEnable).toBe(true);
    expect(body.trafficLimitFrequency).toBe(OMADA_TRAFFIC_LIMIT_TOTAL);
  });

  it("omits traffic and speed caps for unlimited plans", () => {
    const body = buildOmadaVoucherCreateBody({
      name: "TFW-UNL",
      durationMinutes: 60,
      deviceLimit: 1,
      dataAllowanceMb: null,
      speedLimitKbps: null,
    });
    expect(body.amount).toBe(1);
    expect(body.applyToAllPortals).toBe(true);
    expect(body.trafficLimitEnable).toBe(false);
    expect(body.trafficLimit).toBeNull();
    expect(body.upLimit).toBeNull();
    expect(body.downLimit).toBeNull();
  });
});

describe("Omada created voucher parse", () => {
  it("reads a group id from create, then a voucher code from group detail", () => {
    expect(extractCreatedId({ id: "group-1" })).toBe("group-1");
    expect(
      extractCreatedVoucher({
        id: "group-1",
        data: [{ id: "voucher-1", code: "383659" }],
      }),
    ).toEqual({ id: "voucher-1", code: "383659" });
  });

  it("returns null when Omada did not include a code", () => {
    expect(extractCreatedVoucher({ id: "abc" })).toBeNull();
    expect(extractCreatedVoucher([])).toBeNull();
  });
});

describe("Omada live voucher details", () => {
  it("maps controller status integers", () => {
    expect(omadaVoucherStatusLabel(0)).toBe("unused");
    expect(omadaVoucherStatusLabel(1)).toBe("in-use");
    expect(omadaVoucherStatusLabel(2)).toBe("expired");
  });

  it("finds a voucher row by code without needing the database", () => {
    expect(
      findVoucherRowByCode(
        [
          { id: "a", code: "111111", status: 0 },
          { id: "b", code: "222222", status: 1, trafficLimit: 2048, trafficLimitEnable: true },
        ],
        "222222",
      ),
    ).toMatchObject({ id: "b", code: "222222" });
  });

  it("converts Omada trafficUsed bytes and trafficLimit MB to GB", () => {
    expect(
      extractOmadaVoucherFacts({
        status: 0,
        used: true,
        trafficLimitEnable: true,
        trafficLimit: 5120,
        trafficUsed: 1_449_924_654,
        duration: 43200,
        usedTime: 1440,
        maxUsers: 999,
      }),
    ).toMatchObject({
      status: "in-use",
      traffic: "1.35 GB used of 5 GB",
      duration: "29 days left",
      devices: "1",
    });
  });

  it("marks a voucher expired when the controller expiry time has passed", () => {
    expect(
      extractOmadaVoucherFacts({
        status: 0,
        expiredTime: 1_000_000_000_000,
        trafficLimitEnable: true,
        trafficLimit: 5120,
        trafficUsed: 1_449_924_654,
      }),
    ).toMatchObject({
      status: "expired",
      traffic: "1.35 GB used of 5 GB",
    });
  });

  it("shows three gigabytes used of a five gigabyte cap", () => {
    expect(
      extractOmadaVoucherFacts({
        status: 1,
        trafficLimitEnable: true,
        trafficLimit: 5120,
        trafficUsed: 3 * 1024 * 1024 * 1024,
      }),
    ).toMatchObject({
      status: "in-use",
      traffic: "3 GB used of 5 GB",
    });
  });

  it("treats Omada used=0 as unused even when trafficUsed is 0", () => {
    expect(
      extractOmadaVoucherFacts({
        status: 0,
        used: 0,
        valid: true,
        endTime: 9_223_372_036_854_776_000,
        trafficLimitEnable: true,
        trafficLimit: 5120,
        trafficUsed: 0,
      }),
    ).toMatchObject({
      status: "unused",
      traffic: "0 GB used of 5 GB",
      devices: "0",
      expiresAt: null,
    });
  });

  it("pages voucher list rows from the web API envelope", () => {
    expect(
      extractPagedVoucherRows({
        data: [{ code: "111111" }],
        currentPage: 1,
        currentPageSize: 50,
        totalPage: 2,
      }),
    ).toEqual({
      rows: [{ code: "111111" }],
      hasMore: true,
    });
  });
});
