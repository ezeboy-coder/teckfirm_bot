export function displayName(name: string) {
  return name.replace(/\s*\(DEMO\)\s*/gi, "").trim();
}
