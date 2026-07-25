const CACHE_NAME = "todoblake-v1";
const APP_URL_FALLBACK = "/today";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(["/today", "/backlog", "/daily-tasks", "/login"]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

function notificationPayload(event) {
  if (!event.data) return null;
  const raw = event.data.json();
  const data = raw.data || raw;
  const notification = raw.notification || {};
  return {
    title: notification.title || data.title || "TodoBlake",
    body: notification.body || data.body || "A task is due.",
    icon: data.icon || notification.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-192x192.png",
    taskId: data.taskId,
    actionToken: data.actionToken,
    completeUrl: data.completeUrl,
    openUrl: data.openUrl || APP_URL_FALLBACK,
  };
}

self.addEventListener("push", (event) => {
  const payload = notificationPayload(event);
  if (!payload) return;

  const actions = [];
  if (payload.completeUrl && payload.actionToken) {
    actions.push({ action: "complete", title: "Complete" });
  }
  actions.push({ action: "open", title: "Open" });

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.taskId ? `task-${payload.taskId}` : "todoblake-task",
      renotify: true,
      data: payload,
      actions,
    })
  );
});

async function openApp(url) {
  const clientsList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of clientsList) {
    const clientUrl = new URL(client.url);
    const targetUrl = new URL(url, self.location.origin);
    if (clientUrl.origin === targetUrl.origin && "focus" in client) {
      await client.focus();
      if ("navigate" in client) await client.navigate(targetUrl.href);
      return;
    }
  }

  await self.clients.openWindow(url);
}

self.addEventListener("notificationclick", (event) => {
  const payload = event.notification.data || {};
  event.notification.close();

  if (event.action === "complete" && payload.completeUrl && payload.actionToken) {
    event.waitUntil(
      fetch(payload.completeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: payload.actionToken }),
      }).catch(() => openApp(payload.openUrl || APP_URL_FALLBACK))
    );
    return;
  }

  event.waitUntil(openApp(payload.openUrl || APP_URL_FALLBACK));
});
