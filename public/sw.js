/* Premium Construction Group — service worker for phone / desktop alerts.
   It does not cache pages (the site stays exactly as fast and fresh as before); it only shows
   notifications and opens the right conversation when one is tapped. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "New message", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Premium Construction Group";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    icon: "/icons/app-192.png",
    badge: "/icons/badge-96.png",
    data: { url: data.url || "/account" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data && event.notification.data.url ? event.notification.data.url : "/account", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.focus();
        if ("navigate" in client) return client.navigate(url);
        return undefined;
      }
    }
    return self.clients.openWindow(url);
  })());
});
