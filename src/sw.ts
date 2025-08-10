/// <reference lib="WebWorker" />

import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// A injeção do manifesto agora é tratada explicitamente aqui.
// O Workbox pegará a lista de arquivos do self.__WB_MANIFEST e configurará o pré-cache.
precacheAndRoute(self.__WB_MANIFEST);

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
