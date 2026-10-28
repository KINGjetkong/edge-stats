const CACHE_NAME = "madx-offline-v1";
const OFFLINE_URL = "/offline.html";
const OFFLINE_HTML = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>MADX SIGMA6 — offline</title><style>body{box-sizing:border-box;min-height:100vh;margin:0;padding:24px;display:grid;place-items:center;background:#0a0a0b;color:#f3f3f1;font:16px/1.5 Inter,system-ui,sans-serif;text-align:center}main{max-width:32rem}strong{color:#7b5cd6}</style><main><strong>MADX SIGMA6</strong><p>MADX SIGMA6 — offline. Live data needs a connection.</p></main></html>`;
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
  await cache.put(OFFLINE_URL, new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }));
  await self.skipWaiting();
})));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.mode !== "navigate" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/") || url.pathname.startsWith("/@vite/") || request.headers.get("upgrade") === "websocket") return;
  event.respondWith(fetch(request).catch(async () => (await caches.open(CACHE_NAME)).match(OFFLINE_URL)));
});
