/// <reference lib="WebWorker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-core';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

// O Workbox irá injetar o manifesto de pré-cache aqui.
// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST);

cleanupOutdatedCaches();

// Escuta por notificações push.
self.addEventListener('push', (event) => {
  const data = event.data?.json();
  const title = data?.title || 'Notificação';
  const options = {
    body: data?.body || 'Você tem uma nova mensagem.',
    icon: data?.icon || '/favicon.ico',
    badge: '/favicon.ico', // Opcional: um ícone pequeno para a barra de status
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
        // Se um cliente (aba do navegador) com a URL já estiver aberto, foque nele.
        const client = clientList.find((c) => c.url === urlToOpen);
        if (client) {
          return client.focus();
        }
        // Caso contrário, abra uma nova janela.
        return self.clients.openWindow(urlToOpen);
      }),
  );
});
