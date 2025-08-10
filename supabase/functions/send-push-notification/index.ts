import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const VERSION = 'v2025-01-10-fixed';
console.log(`Função send-push-notification iniciada ${VERSION}`);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log(`[${VERSION}] Nova requisição recebida`);
  
  if (req.method === 'OPTIONS') {
    console.log(`[${VERSION}] OPTIONS request - returning CORS headers`);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`[${VERSION}] === INÍCIO DO PROCESSAMENTO ===`);
    
    // Verificar environment variables primeiro
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log(`[${VERSION}] Environment check:`, {
      hasVapidPublic: !!vapidPublicKey,
      hasVapidPrivate: !!vapidPrivateKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRole: !!serviceRoleKey,
      supabaseUrl: supabaseUrl?.substring(0, 30) + '...'
    });

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error(`[${VERSION}] VAPID keys missing!`);
      return new Response(JSON.stringify({ error: 'VAPID keys not configured', version: VERSION }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(`[${VERSION}] Supabase config missing!`);
      return new Response(JSON.stringify({ error: 'Supabase configuration missing', version: VERSION }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Configurar VAPID
    try {
      webpush.setVapidDetails('mailto:notifications@leituraencantada.com', vapidPublicKey, vapidPrivateKey);
      console.log(`[${VERSION}] VAPID configurado com sucesso`);
    } catch (vapidError) {
      console.error(`[${VERSION}] Erro ao configurar VAPID:`, vapidError);
      return new Response(JSON.stringify({ 
        error: 'Failed to configure VAPID', 
        details: vapidError.message,
        version: VERSION 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Ler e parsear o corpo da requisição
    const requestBodyText = await req.text();
    console.log(`[${VERSION}] Corpo da requisição recebido (${requestBodyText.length} chars): ${requestBodyText.substring(0, 200)}...`);

    if (!requestBodyText) {
      console.error(`[${VERSION}] Corpo da requisição está vazio`);
      return new Response(JSON.stringify({ error: 'Request body is empty', version: VERSION }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let payload;
    try {
      payload = JSON.parse(requestBodyText);
      console.log(`[${VERSION}] Payload analisado:`, payload);
    } catch (parseError) {
      console.error(`[${VERSION}] Erro ao parsear JSON:`, parseError.message);
      return new Response(JSON.stringify({ 
        error: `Invalid JSON: ${parseError.message}`, 
        version: VERSION 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { targetUserId, title, body, tag } = payload;
    console.log(`[${VERSION}] Dados extraídos:`, { targetUserId, title, body, tag });

    if (!targetUserId || !title || !body) {
      console.error(`[${VERSION}] Campos obrigatórios ausentes`);
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: targetUserId, title, body',
        received: { targetUserId, title, body, tag },
        version: VERSION 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Conectar ao Supabase
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    console.log(`[${VERSION}] Cliente Supabase criado`);

    // Buscar subscrições
    console.log(`[${VERSION}] Buscando subscrições para usuário: ${targetUserId}`);
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', targetUserId);

    console.log(`[${VERSION}] Resultado da consulta:`, { 
      subscriptionsCount: subscriptions?.length || 0, 
      error: error?.message || null 
    });

    if (error) {
      console.error(`[${VERSION}] Erro ao buscar subscrições:`, error);
      return new Response(JSON.stringify({ 
        error: `Database error: ${error.message}`,
        version: VERSION 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[${VERSION}] Nenhuma subscrição encontrada para o usuário`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No subscriptions found for user',
        targetUserId,
        version: VERSION 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[${VERSION}] Encontradas ${subscriptions.length} subscrições`);

    // Preparar payload da notificação
    const notificationPayload = JSON.stringify({ 
      title, 
      body, 
      tag: tag || `notification-${Date.now()}`, 
      data: { url: '/' } 
    });
    
    const options = { 
      TTL: 86400, 
      urgency: 'high' as const
    };

    console.log(`[${VERSION}] Enviando notificações...`);

    // Enviar notificações
    const results = [];
    for (let i = 0; i < subscriptions.length; i++) {
      const { subscription } = subscriptions[i];
      try {
        console.log(`[${VERSION}] Enviando notificação ${i + 1}/${subscriptions.length}`);
        await webpush.sendNotification(subscription, notificationPayload, options);
        results.push({ success: true, index: i });
        console.log(`[${VERSION}] Notificação ${i + 1} enviada com sucesso`);
      } catch (sendError) {
        console.error(`[${VERSION}] Erro ao enviar notificação ${i + 1}:`, {
          statusCode: sendError.statusCode,
          body: sendError.body,
          message: sendError.message
        });
        results.push({ success: false, error: sendError.message, index: i });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[${VERSION}] === RESULTADO: ${successCount}/${subscriptions.length} notificações enviadas ===`);

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successCount,
      total: subscriptions.length,
      details: results,
      version: VERSION
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(`[${VERSION}] === ERRO GERAL ===`, {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    
    return new Response(JSON.stringify({ 
      error: err.message,
      type: err.name || 'UnknownError',
      version: VERSION
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
