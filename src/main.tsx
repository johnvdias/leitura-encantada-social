import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Registra o Service Worker e recarrega a página assim que uma nova versão
// assumir o controle (o novo SW faz skipWaiting/clients.claim() sozinho,
// mas o bundle JS já carregado na memória da aba só é trocado com um reload).
registerSW({ immediate: true })

let hasReloaded = false;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloaded) return;
    hasReloaded = true;
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
