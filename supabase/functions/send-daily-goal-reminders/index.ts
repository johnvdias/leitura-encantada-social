import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// Frases exageradas/carentes pedidas: um lembrete no fim da tarde (ainda dá
// tempo) e um "última chamada" perto da virada do dia, sempre com tom de
// urgência e saudade do livro, nunca culpabilizando de verdade.
const PHRASES: Record<'evening' | 'final', { title: string; messages: string[] }> = {
  evening: {
    title: '⏰ Sua meta diária está esperando!',
    messages: [
      'SOCORRO! Sua meta de hoje ainda não foi batida e o dia está passando! 😱📚',
      'Seu livro está contando os minutos esperando por você... ainda dá tempo!',
      'Alerta vermelho: meta diária em risco! Corre lá pra não quebrar sua sequência!',
      'Psst... já pensou em ler um pouquinho agora? Sua estante sente sua falta!',
      'Faltam só algumas páginas pra bater sua meta de hoje. Vai desistir agora?',
      'Seu personagem favorito tá esperando o próximo capítulo só com você!',
      'Não deixa sua ofensiva de leitura morrer hoje! Bora ler uns minutinhos?',
      'A noite está perfeita pra ler... e pra bater aquela metinha, né? 📖',
    ],
  },
  final: {
    title: '🚨 Faltam poucas horas pra virar o dia!',
    messages: [
      'ÚLTIMA CHAMADA! Faltam poucas horas e sua meta de hoje ainda não foi batida!!',
      'EMERGÊNCIA LITERÁRIA: o dia está acabando e você ainda não leu sua meta! 🚨',
      'Seu livro está em prantos... faltam só algumas horas pra virar o dia e você não leu nada hoje!',
      'Não deixa sua sequência de leitura morrer à meia-noite! AINDA DÁ TEMPO!',
      'Isso é sério: faltam minutos preciosos pra bater sua meta diária. CORRE!',
      'Seu personagem favorito tá te esperando ansiosamente antes que o dia vire...',
      'ALERTA MÁXIMO: sua meta diária está prestes a escapar pelas suas mãos!',
      'Não vai deixar sua estante dormir triste hoje, vai? Leia antes da meia-noite! 💔📚',
    ],
  },
};

const isCategoryEnabled = (preferences: unknown, category: string): boolean => {
  if (!preferences || typeof preferences !== 'object') return true;
  const value = (preferences as Record<string, unknown>)[category];
  return value !== false;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Supabase configuration missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Essa função só deve ser chamada pelo pg_cron (ver migration
    // schedule_daily_goal_reminders). Como é disparada sem sessão de
    // usuária, a autenticação é um segredo compartilhado guardado no Vault -
    // nunca em texto claro em nenhum arquivo do repositório - comparado aqui
    // com o que vem no cabeçalho x-cron-secret. A função RPC roda com
    // SECURITY DEFINER e só o service_role pode executá-la.
    const { data: expectedSecret, error: secretError } = await supabaseAdmin.rpc('get_cron_secret', {
      secret_name: 'cron_daily_reminder_secret',
    });
    const providedSecret = req.headers.get('x-cron-secret');

    if (secretError || !expectedSecret || providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { stage } = await req.json();
    const pool = stage === 'final' ? PHRASES.final : PHRASES.evening;

    // O público do app é majoritariamente brasileiro e o dia da meta
    // diária é pensado no fuso de Brasília (fixo em UTC-3, sem horário de
    // verão) - meia-noite em BRT corresponde às 03:00 UTC do mesmo dia.
    const now = new Date();
    const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const todayBrt = brtNow.toISOString().slice(0, 10);
    const todayStartIso = `${todayBrt}T03:00:00.000Z`;

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, reading_goal, notification_preferences');

    if (profilesError) throw profilesError;

    const { data: historyToday, error: historyError } = await supabaseAdmin
      .from('reading_history')
      .select('user_id, pages_read')
      .gte('created_at', todayStartIso);

    if (historyError) throw historyError;

    const pagesTodayByUser = new Map<string, number>();
    for (const row of historyToday || []) {
      pagesTodayByUser.set(row.user_id, (pagesTodayByUser.get(row.user_id) || 0) + (row.pages_read || 0));
    }

    const usersToRemind = (profiles || []).filter((profile) => {
      const dailyGoal = profile.reading_goal || 10;
      const pagesToday = pagesTodayByUser.get(profile.user_id) || 0;
      return pagesToday < dailyGoal && isCategoryEnabled(profile.notification_preferences, 'daily_reminder');
    });

    if (usersToRemind.length === 0) {
      return new Response(JSON.stringify({ success: true, remindersSent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messageByUser = new Map<string, string>();
    const notificationRows = usersToRemind.map((profile) => {
      const message = pool.messages[Math.floor(Math.random() * pool.messages.length)];
      messageByUser.set(profile.user_id, message);
      return {
        user_id: profile.user_id,
        type: 'daily_reminder',
        title: pool.title,
        content: message,
      };
    });

    const { error: insertError } = await supabaseAdmin.from('notifications').insert(notificationRows);
    if (insertError) throw insertError;

    let pushSent = 0;
    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails('mailto:notifications@leituraencantada.com', vapidPublicKey, vapidPrivateKey);

      const userIds = usersToRemind.map((p) => p.user_id);
      const { data: subscriptions } = await supabaseAdmin
        .from('push_subscriptions')
        .select('user_id, subscription')
        .in('user_id', userIds);

      for (const sub of subscriptions || []) {
        const message = messageByUser.get(sub.user_id);
        if (!message) continue;

        const payload = JSON.stringify({
          title: pool.title,
          body: message,
          tag: `daily-reminder-${stage}-${todayBrt}`,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: { url: '/estante', timestamp: Date.now() },
        });

        try {
          await webpush.sendNotification(sub.subscription, payload, { TTL: 86400, urgency: 'high' as const });
          pushSent++;
        } catch (_err) {
          // Best-effort - a notificação in-app já foi salva.
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, remindersSent: notificationRows.length, pushSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
