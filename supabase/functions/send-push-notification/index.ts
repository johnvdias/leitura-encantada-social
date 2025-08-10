import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

console.log('Função send-push-notification iniciada.');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('ERRO: As chaves VAPID não foram encontradas nas variáveis de ambiente. Verifique a configuração do Vault e do functions.config.json.');
      throw new Error('As chaves VAPID não foram encontradas nas variáveis de ambiente.');
    }

    webpush.setVapidDetails(
      'mailto:notifications@leituraencantada.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    const { targetUserId, title, body, tag } = await req.json();

    if (!targetUserId || !title || !body) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', targetUserId);

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Nenhuma subscrição encontrada.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notificationPayload = JSON.stringify({ title, body, tag, data: { url: '/' } });
    const options = { TTL: 86400 };

    const sendPromises = subscriptions.map(({ subscription }) =>
      webpush.sendNotification(subscription, notificationPayload, options).catch(err => {
          console.error(`Falha ao enviar notificação. Endpoint: ${err.endpoint}. StatusCode: ${err.statusCode}. Body: ${err.body}.`);
          throw err;
        })
    );

    await Promise.all(sendPromises);

    console.log(`Notificações enviadas com sucesso para o usuário ${targetUserId}.`);
    return new Response(JSON.stringify({ success: true, sent: subscriptions.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const errorMessage = err.body || err.message || 'Erro desconhecido';
    console.error(`Erro geral no bloco catch: ${errorMessage}`);
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
