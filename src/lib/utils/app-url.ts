export function toAbsoluteAppUrl(
  value: string | undefined,
  fallback = "http://localhost:3000",
): string {
  const raw = value?.trim();
  if (!raw) return fallback;

  const candidate = raw.includes("://") ? raw : `https://${raw.replace(/^\/+/, "")}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      parsed.protocol = "http:";
    }
    const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return `${parsed.origin}${path}`;
  } catch {
    return fallback;
  }
}
