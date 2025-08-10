import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // Enable PWA in development
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // The service worker will listen for push events
        runtimeCaching: [
          {
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
            src: '/pwa-192x192.png', // Placeholder icon
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png', // Placeholder icon
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
