import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "child_process";
import { VitePWA } from 'vite-plugin-pwa';
import { pwaOptions } from "./pwa-options";

// Identifica a versão em produção pra dar confirmação visual de que uma
// atualização (deploy novo / pull-to-refresh) realmente trocou o código.
const appVersion =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
  (() => {
    try {
      return execSync("git rev-parse --short HEAD").toString().trim();
    } catch {
      return "dev";
    }
  })();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
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
