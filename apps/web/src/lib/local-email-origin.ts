/** The emulator email link must never use a host supplied by the request. */
export function localEmailOrigin(configuredOrigin: string | undefined): string | null {
  const value = configuredOrigin?.trim() || "http://localhost:3100";
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
        url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}
