import { VitePWAOptions } from 'vite-plugin-pwa';

export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  devOptions: {
    enabled: true, // Habilitar PWA no desenvolvimento
  },
  // A injeção do service worker personalizado garante que o Workbox
  // e a nossa lógica de notificação push coexistam.
  injectRegister: 'script', 
  workbox: {
    // Não pré-cacheia nada por padrão, mas configura o cache em tempo de execução.
    globPatterns: [], 
    runtimeCaching: [
      {
        // Cacheia todas as solicitações de API, priorizando a rede.
        urlPattern: ({ url }) => url.pathname.startsWith('/'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
  manifest: {
    name: 'Leitura Encantada Social',
    short_name: 'Leitura Encantada',
    description: 'Sua rede social para amantes de livros.',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone',
    scope: '/',
    start_url: '/',
    icons: [
      {
        src: 'favicon.ico',
        sizes: '64x64 32x32 24x24 16x16',
        type: 'image/x-icon',
      },
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  },
};
