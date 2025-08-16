import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import { registerSW } from 'virtual:pwa-register'

// Registra o Service Worker
registerSW({ immediate: true })

createRoot(document.getElementById("root")!).render(
    <ThemeProvider>
        <App />
    </ThemeProvider>
);
