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
    
    // **A CORREÇÃO FINAL PARA A APPLE (APNs)**
    // As opções precisam ser formatadas como cabeçalhos (headers).
    const options = {
      TTL: 86400, // 1 dia em segundos
      headers: {
        'Urgency': 'high', // Prioridade da notificação
        'Topic': 'default' // REQUISITO OBRIGATÓRIO PARA O APNs
      }
    };

    const sendPromises = subscriptions.map(({ subscription }) =>
      webpush.sendNotification(subscription, notificationPayload, options)
        .catch(err => {
          console.error(`Falha ao enviar notificação para ${subscription.endpoint}. Erro: ${err.message}`);
        })
    );

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, sent: subscriptions.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
