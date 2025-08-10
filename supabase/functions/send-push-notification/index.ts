import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

console.log('Função send-push-notification iniciada (v_debug_req_body).');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Passo 1: Ler o corpo como texto bruto para depuração
    const requestBodyText = await req.text();
    console.log(`Corpo da requisição recebido (texto): ${requestBodyText}`);

    if (!requestBodyText) {
      throw new Error("O corpo da requisição está vazio.");
    }

    // Passo 2: Tentar analisar o JSON e registrar erro se falhar
    let payload;
    try {
      payload = JSON.parse(requestBodyText);
    } catch (parseError) {
      console.error(`Falha ao analisar o JSON do corpo da requisição. Erro: ${parseError.message}`);
      throw new Error(`JSON inválido: ${requestBodyText}`);
    }
    
    const { targetUserId, title, body, tag } = payload;
    console.log(`Payload analisado com sucesso para o usuário: ${targetUserId}`);

    // Continua com a lógica original...
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('As chaves VAPID não foram encontradas no ambiente.');
    }

    webpush.setVapidDetails('mailto:notifications@leituraencantada.com', vapidPublicKey, vapidPrivateKey);

    if (!targetUserId || !title || !body) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes no payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: subscriptions, error } = await supabaseAdmin.from('push_subscriptions').select('subscription').eq('user_id', targetUserId);

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Nenhuma subscrição encontrada.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    const notificationPayload = JSON.stringify({ title, body, tag, data: { url: '/' } });
    const options = { TTL: 86400, urgency: 'high' }; // Adicionando urgência para melhorar a entrega no APNs

    const sendPromises = subscriptions.map(({ subscription }) =>
      webpush.sendNotification(subscription, notificationPayload, options).catch(err => {
        console.error(`Falha ao enviar notificação. StatusCode: ${err.statusCode}, Body: ${err.body}`);
        throw err;
      })
    );

    await Promise.all(sendPromises);
    console.log(`Notificações enviadas com sucesso para o usuário ${targetUserId}.`);
    return new Response(JSON.stringify({ success: true, sent: subscriptions.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});

  } catch (err) {
    console.error(`Erro geral no bloco catch: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
});