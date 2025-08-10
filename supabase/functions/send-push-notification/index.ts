import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VERSION = 'v2025-simple';
console.log(`Função send-push-notification ${VERSION} iniciada`);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`[${VERSION}] Processando requisição`);
    
    // Ler corpo da requisição
    const requestBody = await req.json();
    console.log(`[${VERSION}] Payload recebido:`, requestBody);
    
    const { targetUserId, title, body, tag } = requestBody;
    
    if (!targetUserId || !title || !body) {
      console.error(`[${VERSION}] Campos obrigatórios ausentes`);
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        version: VERSION 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log(`[${VERSION}] Conectando ao Supabase...`);
    const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey!);
    
    // Buscar subscrições
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', targetUserId);

    if (error) {
      console.error(`[${VERSION}] Erro na consulta:`, error);
      return new Response(JSON.stringify({ 
        error: error.message,
        version: VERSION 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[${VERSION}] Encontradas ${subscriptions?.length || 0} subscrições`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No subscriptions found',
        version: VERSION 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Por enquanto, vamos simular o envio sem usar webpush para isolar o problema
    console.log(`[${VERSION}] Simulando envio de ${subscriptions.length} notificações`);
    
    // TODO: Implementar webpush quando identificarmos o problema
    const results = subscriptions.map((_, index) => ({
      success: true,
      simulated: true,
      index
    }));

    return new Response(JSON.stringify({ 
      success: true, 
      sent: subscriptions.length,
      simulated: true,
      message: 'Push notifications temporariamente simuladas - debugging em progresso',
      version: VERSION
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(`[${VERSION}] Erro geral:`, err.message);
    
    return new Response(JSON.stringify({ 
      error: err.message,
      version: VERSION
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
