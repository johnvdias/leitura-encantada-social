import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';
import { pwaOptions } from "./pwa-options";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
  },
  plugins: [
    react(),
    VitePWA({
      ...pwaOptions,
      // Aponta para o nosso service worker personalizado.
      srcDir: 'src',
      filename: 'sw.ts',
      // Garante que o Workbox e nossa lógica de push coexistam.
      strategies: 'injectManifest',
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
