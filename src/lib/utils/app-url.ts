export function toAbsoluteAppUrl(
  value: string | undefined,
  fallback = "http://localhost:3000",
): string {
  const raw = value?.trim();
  if (!raw) return fallback;

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(raw)
    ? raw
    : `${raw.startsWith("localhost") || raw.startsWith("127.0.0.1") ? "http" : "https"}://${raw.replace(/^\/+/, "")}`;

  return withProtocol.replace(/\/$/, "");
}
