const allowedPrefixes = ["/invite/", "/app/register/", "/app/entries/", "/console/", "/hq/"];

/** Return only same-origin workspace destinations; each destination rechecks authority. */
export function safeAuthReturn(value: string | null | undefined, origin: string): string | null {
  if (!value || /[\u0000-\u001f\\]/.test(value)) return null;
  try {
    const base = new URL(origin);
    const target = new URL(value, base);
    if (target.origin !== base.origin) return null;
    if (target.pathname !== "/onboarding" && target.pathname !== "/console" && target.pathname !== "/hq" && !allowedPrefixes.some(prefix => target.pathname.startsWith(prefix))) return null;
    return `${target.pathname}${target.search}`;
  } catch {
    return null;
  }
}

export function routeWithAuthReturn(path: string, target: string | null): string {
  return target ? `${path}?next=${encodeURIComponent(target)}` : path;
}
