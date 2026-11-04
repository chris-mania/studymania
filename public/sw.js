// Study Mania service worker: offline app shell + daily reminder notifications.
const CACHE = "sm-v17";
const SHELL = ["/", "/index.html", "/styles.css", "/app.js", "/prompt.js", "/shared.mjs", "/local.mjs", "/manifest.webmanifest", "/icons/icon-192.png", "/logo-light.png", "/logo-dark.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  // Network first so updates show up right away; fall back to the cached copy when offline.
  e.respondWith(
    fetch(e.request, { cache: "no-cache" }) // skip the browser's own saved copy so updates always show
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("/index.html")))
  );
});

self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let msg = { title: "📚 Time for today's study", body: "One quick lesson keeps your streak alive." };
    try { if (e.data) msg = { ...msg, ...e.data.json() }; } // the message comes inside the notification
    catch {
      try { const r = await fetch("/api/nudge", { credentials: "same-origin" }); if (r.ok) msg = await r.json(); } catch {}
    }
    await self.registration.showNotification(msg.title, {
      body: msg.body, icon: "/icons/icon-192.png", badge: "/icons/badge-96.png", tag: "daily", renotify: true,
    });
  })());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) { if ("focus" in w) { w.navigate("/#/"); return w.focus(); } }
    return self.clients.openWindow("/#/");
  })());
});
