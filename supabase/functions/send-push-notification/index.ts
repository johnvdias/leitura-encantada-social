import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

console.log('Função send-push-notification iniciada.');

Deno.serve(async (req) => {
  console.log('Requisição recebida.');

  if (req.method !== 'POST') {
    return new Response('Método não permitido', { status: 405 });
  }

  try {
    // 1. Configura o web-push com os segredos do ambiente
    console.log('Configurando detalhes VAPID...');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('As chaves VAPID não foram encontradas nas variáveis de ambiente.');
      return new Response('Configuração do servidor incompleta.', { status: 500 });
    }

    webpush.setVapidDetails(
      'mailto:notifications@leituraencantada.com',
      vapidPublicKey,
      vapidPrivateKey
    );
    console.log('Detalhes VAPID configurados com sucesso.');

    // 2. Extrai os dados do corpo da requisição
    const { targetUserId, title, body, tag } = await req.json();
    console.log(`Dados recebidos: targetUserId=${targetUserId}`);

    if (!targetUserId || !title || !body) {
      return new Response('Campos obrigatórios ausentes', { status: 400 });
    }

    // 3. Cria um cliente Supabase com permissões de administrador
    console.log('Criando cliente Supabase admin...');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('Cliente Supabase admin criado.');

    // 4. Busca as subscrições do usuário alvo
    console.log(`Buscando subscrições para o usuário: ${targetUserId}`);
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', targetUserId);

    if (error) {
      console.error('Erro ao buscar subscrições:', error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('Nenhuma subscrição encontrada para o usuário.');
      // Isso não é um erro fatal, apenas significa que o usuário não tem notificações ativas.
      return new Response(JSON.stringify({ success: true, message: 'Nenhuma subscrição encontrada.' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.log(`Encontradas ${subscriptions.length} subscrições.`);

    // 5. Envia a notificação para cada subscrição
    const notificationPayload = JSON.stringify({ title, body, tag, data: { url: '/' } });

    console.log('Enviando notificações...');
    const sendPromises = subscriptions.map(({ subscription }) =>
      webpush.sendNotification(subscription, notificationPayload)
        .catch(err => {
          console.error(`Falha ao enviar notificação para ${subscription.endpoint}. Erro: ${err.message}`);
          // Futuramente, você pode adicionar lógica para remover subscrições expiradas (erro 410)
        })
    );

    await Promise.all(sendPromises);
    console.log('Notificações enviadas com sucesso.');

    return new Response(JSON.stringify({ success: true, sent: subscriptions.length }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Erro interno do servidor:', err);
    return new Response(err.message, { status: 500 });
  }
});
