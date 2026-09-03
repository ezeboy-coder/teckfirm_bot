type LogLevel = "info" | "warn" | "error";

const SECRET_KEYS = [
  "password",
  "passwordhash",
  "secret",
  "token",
  "authorization",
  "clientsecret",
  "paystack_secret",
  "omada_client_secret",
  "omada_cloud_password",
  "csrf",
  "sessionid",
  "cookie",
  "voucher",
  "code",
];

function shouldRedact(key: string): boolean {
  const normalized = key.toLowerCase();
  return SECRET_KEYS.some((secret) => normalized.includes(secret));
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        shouldRedact(key) ? "[REDACTED]" : redact(entry),
      ]),
    );
  }

  return value;
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const payload = {
    level: level.toUpperCase(),
    message,
    time: new Date().toISOString(),
    ...(context ? { context: redact(context) } : {}),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) =>
    write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    write("error", message, context),
};
