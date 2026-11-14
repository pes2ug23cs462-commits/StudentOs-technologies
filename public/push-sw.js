/* StudentOS push notifications (placement alerts). The server sends data-only
   Firebase Cloud Messaging messages: { data: { title, body, url } }. */
self.addEventListener("push", (event) => {
  let p = {};
  try {
    p = event.data ? event.data.json() : {};
  } catch (e) {
    p = { data: { title: "StudentOS", body: event.data ? event.data.text() : "" } };
  }
  const d = p.data || p.notification || p;
  event.waitUntil(
    self.registration.showNotification(d.title || "StudentOS", {
      body: d.body || "",
      icon: "/studentos-mark.png",
      badge: "/studentos-mark.png",
      data: { url: d.url || "/placement" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/placement", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && "focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
