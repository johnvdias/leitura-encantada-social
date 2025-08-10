/// <reference lib="WebWorker" />

declare let self: ServiceWorkerGlobalScope;

// O Workbox e o vite-plugin-pwa gerenciarão o skipWaiting, clientsClaim e o pré-cache.
// O manifesto do Workbox será injetado automaticamente aqui.

// Escuta por notificações push.
self.addEventListener('push', (event) => {
  const data = event.data?.json();
  const title = data?.title || 'Notificação';
  const options = {
    body: data?.body || 'Você tem uma nova mensagem.',
    icon: data?.icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: data?.data?.url || '/', // URL para abrir ao clicar
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Lida com cliques na notificação.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        const client = clientList.find((c) => new URL(c.url).pathname === new URL(urlToOpen, self.location.origin).pathname);
        if (client) {
          return client.focus();
        }
        return self.clients.openWindow(urlToOpen);
      }),
  );
});
