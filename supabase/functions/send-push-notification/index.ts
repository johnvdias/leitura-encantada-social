import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const VERSION = 'v2025-production';
console.log(`✅ Função send-push-notification ${VERSION} iniciada`);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log(`[${VERSION}] 🚀 Nova requisição recebida`);

  if (req.method === 'OPTIONS') {
    console.log(`[${VERSION}] ✅ OPTIONS request - CORS headers enviados`);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`[${VERSION}] 📋 === INICIANDO PROCESSAMENTO ===`);

    // 1. Verificar environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log(`[${VERSION}] 🔧 Environment variables:`, {
      hasVapidPublic: !!vapidPublicKey,
      hasVapidPrivate: !!vapidPrivateKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRole: !!serviceRoleKey,
      vapidPublicPreview: vapidPublicKey?.substring(0, 20) + '...'
    });

    // Verificar se temos todas as chaves necessárias
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error(`[${VERSION}] ❌ VAPID keys não encontradas!`);
      return new Response(JSON.stringify({
        error: 'VAPID keys not configured',
        details: 'VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables are required',
        version: VERSION
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(`[${VERSION}] ❌ Supabase config não encontrada!`);
      return new Response(JSON.stringify({
        error: 'Supabase configuration missing',
        details: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required',
        version: VERSION
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Configurar VAPID
    try {
      webpush.setVapidDetails(
        'mailto:notifications@leituraencantada.com',
        vapidPublicKey,
        vapidPrivateKey
      );
      console.log(`[${VERSION}] ✅ VAPID configurado com sucesso`);
    } catch (vapidError) {
      console.error(`[${VERSION}] ❌ Erro ao configurar VAPID:`, vapidError);
      return new Response(JSON.stringify({
        error: 'Failed to configure VAPID',
        details: vapidError.message,
        version: VERSION
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Processar payload
    const requestBody = await req.json();
    console.log(`[${VERSION}] 📥 Payload recebido:`, requestBody);

    const { targetUserId, title, body, tag } = requestBody;

    if (!targetUserId || !title || !body) {
      console.error(`[${VERSION}] ❌ Campos obrigatórios ausentes`);
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        required: ['targetUserId', 'title', 'body'],
        received: { targetUserId: !!targetUserId, title: !!title, body: !!body },
        version: VERSION
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Conectar ao Supabase
    console.log(`[${VERSION}] 🔗 Conectando ao Supabase...`);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 5. Buscar subscrições do usuário
    console.log(`[${VERSION}] 🔍 Buscando subscrições para usuário: ${targetUserId}`);

    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', targetUserId);

    if (error) {
      console.error(`[${VERSION}] ❌ Erro na consulta Supabase:`, error);
      return new Response(JSON.stringify({
        error: 'Database query failed',
        details: error.message,
        version: VERSION
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[${VERSION}] 📊 Encontradas ${subscriptions?.length || 0} subscrições`);

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[${VERSION}] ℹ️ Nenhuma subscrição encontrada - usuário não tem push notifications ativadas`);
      return new Response(JSON.stringify({
        success: true,
        message: 'No push subscriptions found for user',
        targetUserId,
        version: VERSION
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 6. Preparar e enviar notificações
    const notificationPayload = JSON.stringify({
      title,
      body,
      tag: tag || `notification-${Date.now()}`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        url: '/',
        timestamp: Date.now(),
        type: 'nudge'
      }
    });

    const options = {
      TTL: 86400, // 24 horas
      urgency: 'high' as const,
      headers: {
        'Topic': 'notifications'
      }
    };

    console.log(`[${VERSION}] 📨 Enviando ${subscriptions.length} notificações...`);

    const results = [];
    let successCount = 0;

    for (let i = 0; i < subscriptions.length; i++) {
      const { subscription } = subscriptions[i];

      try {
        console.log(`[${VERSION}] 📤 Enviando notificação ${i + 1}/${subscriptions.length}`);

        await webpush.sendNotification(subscription, notificationPayload, options);

        results.push({
          success: true,
          index: i,
          subscriptionEndpoint: subscription.endpoint?.substring(0, 50) + '...'
        });
        successCount++;

        console.log(`[${VERSION}] ✅ Notificação ${i + 1} enviada com sucesso`);

      } catch (sendError) {
        console.error(`[${VERSION}] ❌ Erro ao enviar notificação ${i + 1}:`, {
          statusCode: sendError.statusCode,
          body: sendError.body,
          message: sendError.message,
          headers: sendError.headers
        });

        results.push({
          success: false,
          error: sendError.message,
          statusCode: sendError.statusCode,
          index: i
        });
      }
    }

    console.log(`[${VERSION}] 🎯 === RESULTADO FINAL: ${successCount}/${subscriptions.length} notificações enviadas ===`);

    return new Response(JSON.stringify({
      success: true,
      sent: successCount,
      total: subscriptions.length,
      results,
      version: VERSION,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(`[${VERSION}] 💥 === ERRO CRÍTICO ===`, {
      message: err.message,
      stack: err.stack,
      name: err.name,
      cause: err.cause
    });

    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: err.message,
      type: err.name || 'UnknownError',
      version: VERSION,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
