import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const VERSION = 'v2025-safari-fixed';
console.log(`🍎 Push Notifications ${VERSION} - COMPATÍVEL COM TODOS OS NAVEGADORES!`);

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

    console.log(`[${VERSION}] 🔧 Verificando configuração...`);

    if (!vapidPublicKey || !vapidPrivateKey || !supabaseUrl || !serviceRoleKey) {
      console.error(`[${VERSION}] ❌ Configuração incompleta`);
      return new Response(JSON.stringify({ 
        error: 'Configuração incompleta',
        version: VERSION 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Configurar VAPID com configurações compatíveis com Safari
    try {
      webpush.setVapidDetails(
        'mailto:notifications@leituraencantada.com', 
        vapidPublicKey, 
        vapidPrivateKey
      );
      console.log(`[${VERSION}] ✅ VAPID configurado`);
    } catch (vapidError) {
      console.error(`[${VERSION}] ❌ Erro VAPID:`, vapidError);
      return new Response(JSON.stringify({ 
        error: 'Erro de configuração VAPID',
        version: VERSION 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Processar dados
    const requestBody = await req.json();
    const { targetUserId, title, body, tag } = requestBody;
    
    if (!targetUserId || !title || !body) {
      return new Response(JSON.stringify({ 
        error: 'Campos obrigatórios: targetUserId, title, body',
        version: VERSION 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Conectar ao Supabase
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // 5. Buscar subscrições válidas
    console.log(`[${VERSION}] 🔍 Buscando subscrições para: ${targetUserId}`);
    
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', targetUserId);

    if (error) {
      console.error(`[${VERSION}] ❌ Erro DB:`, error);
      return new Response(JSON.stringify({ 
        error: 'Erro no banco de dados',
        version: VERSION 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[${VERSION}] ℹ️ Nenhuma subscrição encontrada`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Usuário não tem push notifications habilitadas',
        version: VERSION 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[${VERSION}] 📊 Tentando enviar para ${subscriptions.length} dispositivos`);

    // 6. Preparar payload otimizado para Safari
    const notificationPayload = JSON.stringify({ 
      title, 
      body, 
      tag: tag || `nudge-${Date.now()}`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: { 
        url: '/',
        type: 'nudge'
      },
      // Configurações específicas para Safari
      requireInteraction: false,
      silent: false
    });
    
    // 7. Enviar com tratamento robusto de erros
    const results = [];
    let successCount = 0;
    const invalidSubscriptions = [];

    for (let i = 0; i < subscriptions.length; i++) {
      const sub = subscriptions[i];
      
      try {
        console.log(`[${VERSION}] 📤 Enviando ${i + 1}/${subscriptions.length}...`);
        
        // Configurações otimizadas para diferentes navegadores
        const options = {
          TTL: 86400, // 24 horas
          urgency: 'normal', // 'normal' funciona melhor que 'high' no Safari
          headers: {
            'Topic': 'notifications'
          }
        };
        
        await webpush.sendNotification(sub.subscription, notificationPayload, options);
        
        results.push({ success: true, index: i });
        successCount++;
        console.log(`[${VERSION}] ✅ Enviado ${i + 1} com sucesso!`);
        
      } catch (sendError) {
        console.error(`[${VERSION}] ❌ Erro no envio ${i + 1}:`, {
          statusCode: sendError.statusCode,
          message: sendError.message
        });
        
        results.push({ 
          success: false, 
          error: sendError.message,
          statusCode: sendError.statusCode,
          index: i 
        });

        // Se a subscrição está inválida (410 ou 400), marcar para remoção
        if (sendError.statusCode === 410 || sendError.statusCode === 400) {
          invalidSubscriptions.push(sub.id);
          console.log(`[${VERSION}] 🗑️ Subscrição ${i + 1} marcada para remoção (inválida)`);
        }
      }
    }

    // 8. Limpar subscrições inválidas
    if (invalidSubscriptions.length > 0) {
      console.log(`[${VERSION}] 🧹 Removendo ${invalidSubscriptions.length} subscrições inválidas...`);
      
      try {
        await supabaseAdmin
          .from('push_subscriptions')
          .delete()
          .in('id', invalidSubscriptions);
        
        console.log(`[${VERSION}] ✅ Subscrições inválidas removidas`);
      } catch (cleanupError) {
        console.error(`[${VERSION}] ⚠️ Erro ao limpar subscrições:`, cleanupError);
      }
    }

    console.log(`[${VERSION}] 🎯 RESULTADO FINAL: ${successCount}/${subscriptions.length} enviadas com sucesso`);

    // 9. Resposta de sucesso
    return new Response(JSON.stringify({ 
      success: true, 
      sent: successCount,
      total: subscriptions.length,
      failed: subscriptions.length - successCount,
      invalidRemoved: invalidSubscriptions.length,
      message: successCount > 0 ? 
        `${successCount} push notifications enviadas!` : 
        'Nenhuma push notification foi enviada (subscrições podem estar inválidas)',
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
      error: 'Erro interno',
      details: err.message,
      version: VERSION
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
