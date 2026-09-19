import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { APP_UPDATED_FLAG_KEY } from '@/lib/pwaUpdate'

const UPDATE_CHECK_INTERVAL = 60 * 1000; // 1 minuto

// Registra o Service Worker e recarrega a página assim que uma nova versão
// assumir o controle (o novo SW faz skipWaiting/clients.claim() sozinho,
// mas o bundle JS já carregado na memória da aba só é trocado com um reload).
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;

    // O navegador só rechecaria o Service Worker sozinho de vez em quando
    // (geralmente só numa navegação nova) - quem deixa o PWA instalado
    // aberto sem navegar nunca veria uma atualização sem isso. Rechecando
    // aqui, a versão nova é baixada, instalada e assume o controle
    // automaticamente, sem precisar de nenhuma ação do usuário.
    const checkForUpdate = () => {
      registration.update().catch(() => {
        // sem internet ou falha de rede; tenta de novo no próximo ciclo.
      });
    };

    setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
    window.addEventListener('focus', checkForUpdate);
  },
})

let hasReloaded = false;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloaded) return;
    hasReloaded = true;
    try {
      sessionStorage.setItem(APP_UPDATED_FLAG_KEY, '1');
    } catch {
      // sessionStorage indisponível; o reload ainda funciona normalmente.
    }
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
