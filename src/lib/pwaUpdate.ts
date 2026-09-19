// Chave de sessionStorage usada pra avisar o usuário, depois de um reload
// causado por uma atualização (seja pelo gesto manual de puxar a tela, seja
// pela verificação automática e periódica do Service Worker), que o app
// realmente atualizou - sem isso não dá pra saber se um reload aconteceu
// por causa de uma versão nova ou por qualquer outro motivo.
export const APP_UPDATED_FLAG_KEY = "app-updated-pending";
