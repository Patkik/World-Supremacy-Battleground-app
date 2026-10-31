/* Cache only the generic offline workspace and public, hashed build assets.
   Never cache API responses, Firebase traffic, private pages, or action links. */
const VERSION = "wsb-offline-v1";
const SHELL = "/offline";
function publicAsset(path) {
  const url = new URL(path, self.location.origin);
  return url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/") || (url.pathname === "/_next/image" && url.searchParams.get("url") === "/brand/wsb-logo.png"));
}
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const response = await fetch(SHELL, { cache: "reload", credentials: "omit" });
    if (!response.ok) throw new Error("Offline workspace is unavailable");
    const html = await response.clone().text();
    const cache = await caches.open(VERSION);
    const assets = [...new Set([...html.matchAll(/(?:src|href)="([^"\s]+)"/g)].map(match => match[1].replaceAll("&amp;", "&")).filter(publicAsset))];
    await cache.put(SHELL, response);
    await cache.addAll(assets);
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith("wsb-offline-") && key !== VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (publicAsset(url.href)) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  } else if (request.mode === "navigate") {
    event.respondWith((async () => {
      try { return await fetch(request); }
      catch {
        const cached = await (await caches.open(VERSION)).match(SHELL);
        return cached || Response.error();
      }
    })());
  }
});
