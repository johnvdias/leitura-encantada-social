import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const VERSION = 'v2025-dashboard-deploy';
console.log(`🚀 Push Notifications ${VERSION} - FUNCIONANDO!`);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log(`[${VERSION}] 📨 Nova requisição para push notification`);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verificar environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log(`[${VERSION}] 🔧 Verificando configuração:`, {
      hasVapidPublic: !!vapidPublicKey,
      hasVapidPrivate: !!vapidPrivateKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRole: !!serviceRoleKey
    });

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error(`[${VERSION}] ❌ VAPID keys não encontradas!`);
      return new Response(JSON.stringify({ 
        error: 'VAPID keys not configured. Configure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Environment Variables.',
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
        error: 'Failed to configure VAPID keys',
        details: vapidError.message,
        version: VERSION 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Processar dados da requisição
    const requestBody = await req.json();
    console.log(`[${VERSION}] 📥 Dados recebidos:`, requestBody);
    
    const { targetUserId, title, body, tag } = requestBody;
    
    if (!targetUserId || !title || !body) {
      console.error(`[${VERSION}] ❌ Campos obrigatórios ausentes`);
      return new Response(JSON.stringify({ 
        error: 'Campos obrigatórios: targetUserId, title, body',
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
    
    // 5. Buscar subscrições de push do usuário
    console.log(`[${VERSION}] 🔍 Buscando subscrições para usuário: ${targetUserId}`);
    
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', targetUserId);

    if (error) {
      console.error(`[${VERSION}] ❌ Erro na consulta:`, error);
      return new Response(JSON.stringify({ 
        error: 'Erro ao buscar subscrições',
        details: error.message,
        version: VERSION 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[${VERSION}] 📊 Encontradas ${subscriptions?.length || 0} subscrições`);

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[${VERSION}] ℹ️ Usuário não tem push notifications ativadas`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Usuário não tem push notifications habilitadas',
        targetUserId,
        version: VERSION 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 6. Preparar notificação
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
      urgency: 'high' as const
    };

    console.log(`[${VERSION}] 📨 Enviando ${subscriptions.length} push notifications...`);

    // 7. Enviar notificações
    const results = [];
    let successCount = 0;

    for (let i = 0; i < subscriptions.length; i++) {
      const { subscription } = subscriptions[i];
      
      try {
        console.log(`[${VERSION}] 📤 Enviando ${i + 1}/${subscriptions.length}...`);
        
        await webpush.sendNotification(subscription, notificationPayload, options);
        
        results.push({ 
          success: true, 
          index: i
        });
        successCount++;
        
        console.log(`[${VERSION}] ✅ Push notification ${i + 1} enviada!`);
        
      } catch (sendError) {
        console.error(`[${VERSION}] ❌ Erro ao enviar ${i + 1}:`, {
          statusCode: sendError.statusCode,
          message: sendError.message
        });
        
        results.push({ 
          success: false, 
          error: sendError.message,
          index: i 
        });
      }
    }

    console.log(`[${VERSION}] 🎯 RESULTADO: ${successCount}/${subscriptions.length} push notifications enviadas!`);

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successCount,
      total: subscriptions.length,
      message: `${successCount} push notifications enviadas com sucesso!`,
      version: VERSION,
      timestamp: new Date().toISOString()
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(`[${VERSION}] 💥 ERRO CRÍTICO:`, {
      message: err.message,
      stack: err.stack
    });
    
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor',
      details: err.message,
      version: VERSION
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
