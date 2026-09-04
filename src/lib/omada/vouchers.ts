import { isUnlimitedDeviceLimit } from "@/lib/plans/terms";

export type OmadaVoucherCreateBody = {
  name: string;
  codeLength: number;
  codeForm: number[];
  amount: number;
  type: number;
  logout: boolean;
  duration: number;
  durationType: number;
  maxUsers: number;
  trafficLimitFrequency: number;
  applyToAllPortals: boolean;
  validityType: number;
  voucherValidityEnable: boolean;
  upTimeLimitEnable: boolean;
  downLimitEnable: boolean;
  upLimitEnable: boolean;
  trafficLimitEnable: boolean;
  upLimit: number | null;
  downLimit: number | null;
  trafficLimit: number | null;
  description?: string;
};

export type OmadaVoucherCreateInput = {
  name: string;
  durationMinutes: number;
  deviceLimit: number;
  dataAllowanceMb: number | null;
  speedLimitKbps: number | null;
  note?: string;
};

export type OmadaCreatedVoucher = {
  id: string;
  code: string;
};

/** Omada voucher UI: 0 Total, 1 Daily, 2 Weekly, 3 Monthly. */
export const OMADA_TRAFFIC_LIMIT_TOTAL = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Body for POST `/hotspot/sites/{siteId}/voucherGroups`.
 * Field names come from Omada 6.2 `voucherGeneralModel` after serialize.
 * Individual POST `/vouchers` is rejected on this controller ("select at least one portal"
 * or "General error"); groups are the working create path.
 */
export function buildOmadaVoucherCreateBody(input: OmadaVoucherCreateInput): OmadaVoucherCreateBody {
  const hasSpeed = input.speedLimitKbps != null && input.speedLimitKbps > 0;
  const hasDataCap = input.dataAllowanceMb != null && input.dataAllowanceMb > 0;
  const unlimitedDevices = isUnlimitedDeviceLimit(input.deviceLimit);
  const body: OmadaVoucherCreateBody = {
    name: input.name.slice(0, 32),
    codeLength: 6,
    codeForm: [0],
    amount: 1,
    type: unlimitedDevices ? 2 : 0,
    logout: true,
    duration: input.durationMinutes,
    durationType: 1,
    maxUsers: unlimitedDevices ? 999 : Math.max(1, input.deviceLimit),
    trafficLimitFrequency: OMADA_TRAFFIC_LIMIT_TOTAL,
    applyToAllPortals: true,
    validityType: 0,
    voucherValidityEnable: false,
    upTimeLimitEnable: false,
    downLimitEnable: hasSpeed,
    upLimitEnable: hasSpeed,
    trafficLimitEnable: hasDataCap,
    upLimit: hasSpeed ? input.speedLimitKbps : null,
    downLimit: hasSpeed ? input.speedLimitKbps : null,
    trafficLimit: hasDataCap ? input.dataAllowanceMb : null,
  };

  if (input.note) {
    body.description = input.note.slice(0, 256);
  }

  return body;
}

export function extractCreatedId(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  return typeof payload.id === "string" && payload.id.trim() ? payload.id.trim() : null;
}

function readCreatedVoucher(value: unknown): OmadaCreatedVoucher | null {
  if (!isRecord(value)) return null;

  const code = value.code ?? value.voucherCode;
  if (typeof code !== "string" || !code.trim()) return null;

  const id = value.id ?? value.voucherId;
  const idText =
    typeof id === "string" && id.trim()
      ? id
      : typeof id === "number"
        ? String(id)
        : code.trim();

  return { id: idText, code: code.trim() };
}

export function extractCreatedVoucher(payload: unknown): OmadaCreatedVoucher | null {
  const direct = readCreatedVoucher(payload);
  if (direct) return direct;

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractCreatedVoucher(item);
      if (found) return found;
    }
    return null;
  }

  if (!isRecord(payload)) return null;

  const nested = payload.data ?? payload.list ?? payload.vouchers ?? payload.voucherList ?? payload.result;
  if (nested !== undefined && nested !== payload) {
    return extractCreatedVoucher(nested);
  }

  return null;
}

export type OmadaVoucherStatus = "unused" | "in-use" | "expired";
export type LiveGuestVoucherStatus = Extract<OmadaVoucherStatus, "unused" | "in-use">;

export function keepLiveGuestVoucher(status: OmadaVoucherStatus | null): status is LiveGuestVoucherStatus {
  return status === "unused" || status === "in-use";
}

export type OmadaVoucherFacts = {
  status: OmadaVoucherStatus;
  traffic: string;
  duration: string;
  devices: string;
  expiresAt: string | null;
};

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function voucherRowCode(value: unknown): string | null {
  if (!isRecord(value)) return null;
  return readString(value.code) ?? readString(value.voucherCode);
}

export function findVoucherRowByCode(rows: unknown[], code: string): Record<string, unknown> | null {
  const wanted = code.trim();
  for (const row of rows) {
    const found = voucherRowCode(row);
    if (found && found === wanted && isRecord(row)) {
      return row;
    }
  }
  return null;
}

export function omadaVoucherStatusLabel(value: unknown): OmadaVoucherStatus | null {
  if (value === 0 || value === "0") return "unused";
  if (value === 1 || value === "1") return "in-use";
  if (value === 2 || value === "2") return "expired";
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (normalized === "unused" || normalized === "unused-voucher") return "unused";
  if (normalized === "in-use" || normalized === "used" || normalized === "inuse" || normalized === "active") {
    return "in-use";
  }
  if (normalized === "expired" || normalized === "expire") return "expired";
  return null;
}

function readBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function timestampMs(value: number): number {
  return value >= 1_000_000_000_000 ? value : value * 1000;
}

function toIsoTimestamp(value: number | null): string | null {
  if (value == null || value <= 0) return null;
  const date = new Date(timestampMs(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function readUsedCount(value: unknown): number | null {
  if (typeof value === "boolean") return value ? 1 : 0;
  return readNumber(value);
}

function inferOmadaVoucherStatus(row: Record<string, unknown>): OmadaVoucherStatus {
  const labeled = omadaVoucherStatusLabel(row.status ?? row.voucherStatus ?? row.useStatus);
  if (labeled === "expired" || row.expired === true || row.invalid === true) {
    return "expired";
  }

  const expiresAt = toIsoTimestamp(
    readNumber(row.expiredTime ?? row.expirationTime ?? row.expireTime ?? row.endTime),
  );
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
    return "expired";
  }

  const usedCount = readUsedCount(row.used);
  const leftTime = readNumber(row.leftTime ?? row.remainTime ?? row.remainingTime);
  if (leftTime === 0 && usedCount != null && usedCount > 0) return "expired";

  if (usedCount === 0) return "unused";
  if (labeled === "in-use" || (usedCount != null && usedCount > 0)) {
    return "in-use";
  }

  const usedUsers = readNumber(row.usedUsers ?? row.userNum ?? row.usedClientNum ?? row.onlineNum);
  const usedMinutes = readNumber(row.usedTime ?? row.onlineTime ?? row.usedDuration);
  const lastLogin = readNumber(row.lastLoginTime ?? row.loginTime ?? row.firstUsedTime ?? row.authTime);
  if (
    (usedUsers != null && usedUsers > 0) ||
    (usedMinutes != null && usedMinutes > 0) ||
    (lastLogin != null && lastLogin > 0) ||
    readBoolean(row.online) === true
  ) {
    return "in-use";
  }

  return "unused";
}

function formatGb(gb: number): string {
  if (gb <= 0) return "0 GB";
  if (Number.isInteger(gb)) return `${gb} GB`;
  if (gb >= 1) return `${Number(gb.toFixed(2))} GB`;
  return `${Number(gb.toFixed(3))} GB`;
}

function formatUsedOfTotal(usedGb: number, limitGb: number): string {
  return `${formatGb(usedGb)} used of ${formatGb(limitGb)}`;
}

/** Omada `trafficLimit` is megabytes. */
function formatMegabytesAsGb(mb: number): string {
  return formatGb(mb / 1024);
}

function formatMinutes(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function durationMinutesFromRow(row: Record<string, unknown>): number | null {
  const duration = readNumber(row.duration);
  if (duration == null || duration <= 0) return null;
  const durationType = readNumber(row.durationType);
  if (durationType === 0) return duration * 60;
  return duration;
}

export function extractOmadaVoucherFacts(row: Record<string, unknown>): OmadaVoucherFacts {
  const status = inferOmadaVoucherStatus(row);
  const trafficEnabled = row.trafficLimitEnable !== false;
  const trafficLimitMb = readNumber(row.trafficLimit ?? row.trafficQuota);
  const usedTrafficBytes = readNumber(row.trafficUsed ?? row.usedTraffic ?? row.usedData ?? row.download);
  let traffic = "Unlimited";
  if (trafficEnabled && trafficLimitMb != null && trafficLimitMb > 0) {
    const limitGb = trafficLimitMb / 1024;
    if (status === "unused") {
      traffic = formatUsedOfTotal(0, limitGb);
    } else if (usedTrafficBytes != null && usedTrafficBytes >= 0) {
      // Omada `trafficUsed` is consumed bytes, not remaining.
      const usedGb = usedTrafficBytes / 1024 / 1024 / 1024;
      traffic = formatUsedOfTotal(usedGb, limitGb);
    } else {
      traffic = formatMegabytesAsGb(trafficLimitMb);
    }
  }

  const durationMinutes = durationMinutesFromRow(row);
  const usedMinutes = readNumber(row.usedTime ?? row.onlineTime ?? row.usedDuration);
  let duration = "—";
  if (durationMinutes != null) {
    const remaining =
      usedMinutes != null && usedMinutes >= 0 ? Math.max(0, durationMinutes - usedMinutes) : null;
    duration = remaining != null ? `${formatMinutes(remaining)} left` : formatMinutes(durationMinutes);
  }

  const usedUsers = readNumber(row.usedUsers ?? row.userNum ?? row.usedClientNum ?? row.onlineNum);
  const usedCount = readUsedCount(row.used ?? row.online);
  const devices = `${
    usedUsers != null && usedUsers >= 0 ? usedUsers : usedCount != null && usedCount >= 0 ? usedCount : 0
  }`;

  const expiresAt = toIsoTimestamp(
    readNumber(row.expiredTime ?? row.expirationTime ?? row.expireTime ?? row.endTime),
  );

  return {
    status,
    traffic,
    duration,
    devices,
    expiresAt,
  };
}
