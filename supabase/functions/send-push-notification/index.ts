import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

console.log('Função send-push-notification iniciada (v_fixed_2025).');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== INÍCIO DO PROCESSAMENTO ===');
    
    // Verificar environment variables primeiro
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:', {
      hasVapidPublic: !!vapidPublicKey,
      hasVapidPrivate: !!vapidPrivateKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRole: !!serviceRoleKey
    });

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys missing!');
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Supabase config missing!');
      return new Response(JSON.stringify({ error: 'Supabase configuration missing' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Configurar VAPID
    try {
      webpush.setVapidDetails('mailto:notifications@leituraencantada.com', vapidPublicKey, vapidPrivateKey);
      console.log('VAPID configurado com sucesso');
    } catch (vapidError) {
      console.error('Erro ao configurar VAPID:', vapidError);
      return new Response(JSON.stringify({ error: 'Failed to configure VAPID' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Ler e parsear o corpo da requisição
    const requestBodyText = await req.text();
    console.log(`Corpo da requisição recebido: ${requestBodyText}`);

    if (!requestBodyText) {
      console.error('Corpo da requisição está vazio');
      return new Response(JSON.stringify({ error: 'Request body is empty' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let payload;
    try {
      payload = JSON.parse(requestBodyText);
      console.log('Payload analisado:', payload);
    } catch (parseError) {
      console.error(`Erro ao parsear JSON: ${parseError.message}`);
      return new Response(JSON.stringify({ error: `Invalid JSON: ${parseError.message}` }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { targetUserId, title, body, tag } = payload;
    console.log('Dados extraídos:', { targetUserId, title, body, tag });

    if (!targetUserId || !title || !body) {
      console.error('Campos obrigatórios ausentes');
      return new Response(JSON.stringify({ error: 'Missing required fields: targetUserId, title, body' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Conectar ao Supabase
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    console.log('Cliente Supabase criado');

    // Buscar subscrições
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', targetUserId);

    console.log('Resultado da consulta:', { subscriptions, error });

    if (error) {
      console.error('Erro ao buscar subscrições:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('Nenhuma subscrição encontrada para o usuário');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No subscriptions found for user',
        targetUserId 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Encontradas ${subscriptions.length} subscrições`);

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

    console.log('Enviando notificações...');

    // Enviar notificações
    const results = [];
    for (const { subscription } of subscriptions) {
      try {
        console.log('Enviando para subscrição:', JSON.stringify(subscription).substring(0, 100) + '...');
        await webpush.sendNotification(subscription, notificationPayload, options);
        results.push({ success: true });
        console.log('Notificação enviada com sucesso');
      } catch (sendError) {
        console.error(`Erro ao enviar notificação:`, {
          statusCode: sendError.statusCode,
          body: sendError.body,
          message: sendError.message
        });
        results.push({ success: false, error: sendError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`=== RESULTADO: ${successCount}/${subscriptions.length} notificações enviadas ===`);

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successCount,
      total: subscriptions.length,
      details: results
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(`=== ERRO GERAL ===`, {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    
    return new Response(JSON.stringify({ 
      error: err.message,
      type: err.name || 'UnknownError'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
