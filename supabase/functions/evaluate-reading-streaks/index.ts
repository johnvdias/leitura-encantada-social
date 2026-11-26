import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// Mesmo limite pedido pelo usuário pra meta de leitura diária pessoal -
// diferente do limite de 3 usado pro cronograma de clube/duo.
const MAX_FREEZES = 4;

type NotificationRow = { user_id: string; type: string; title: string; content: string; related_id: string | null };
type PushTarget = { userId: string; title: string; body: string };

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

    // Mesma convenção de fuso das outras functions de cron: BRT fixo em
    // UTC-3. Essa function roda às 23:50 BRT, perto do fim do dia civil mas
    // ainda dentro dele, pra avaliar o dia que está terminando.
    const now = new Date();
    const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const todayBrt = brtNow.toISOString().slice(0, 10);
    const todayStartIso = `${todayBrt}T03:00:00.000Z`;

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails('mailto:notifications@leituraencantada.com', vapidPublicKey, vapidPrivateKey);
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, reading_goal, reading_streak_current, reading_streak_longest, reading_streak_freezes, notification_preferences')
      .or(`reading_streak_last_evaluated.is.null,reading_streak_last_evaluated.neq.${todayBrt}`);

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ success: true, extended: 0, frozen: 0, broken: 0, unchanged: 0, pushSent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userIds = profiles.map((p) => p.user_id);
    const { data: historyToday, error: historyError } = await supabaseAdmin
      .from('reading_history')
      .select('user_id, pages_read')
      .in('user_id', userIds)
      .gte('created_at', todayStartIso);

    if (historyError) throw historyError;

    const pagesByUser = new Map<string, number>();
    for (const row of historyToday || []) {
      pagesByUser.set(row.user_id, (pagesByUser.get(row.user_id) || 0) + (row.pages_read || 0));
    }

    const wantsNotif = (prefs: unknown) => {
      if (!prefs || typeof prefs !== 'object') return true;
      return (prefs as Record<string, unknown>).goal_streak !== false;
    };

    const updates: Record<string, unknown>[] = [];
    const notificationRows: NotificationRow[] = [];
    const pushTargets: PushTarget[] = [];
    let extended = 0;
    let frozen = 0;
    let broken = 0;
    let unchanged = 0;

    for (const p of profiles) {
      const goal = p.reading_goal || 10;
      const pagesToday = pagesByUser.get(p.user_id) || 0;
      const metToday = pagesToday >= goal;
      const current = p.reading_streak_current || 0;
      const longest = p.reading_streak_longest || 0;
      const freezes = p.reading_streak_freezes || 0;

      let newCurrent = current;
      let newLongest = longest;
      let newFreezes = freezes;
      let type: string | null = null;
      let title = '';
      let content = '';
      let sendPush = false;

      if (metToday) {
        newCurrent = current + 1;
        newLongest = Math.max(longest, newCurrent);
        if (newCurrent % 7 === 0 && newFreezes < MAX_FREEZES) newFreezes += 1;
        extended++;

        type = 'reading_streak_extended';
        title = `🔥 ${newCurrent} ${newCurrent === 1 ? 'dia' : 'dias'} seguidos!`;
        content = newCurrent % 7 === 0 && newFreezes > freezes
          ? `Você bateu a meta diária hoje e ganhou um gelinho! Agora tem ${newFreezes} disponível(is).`
          : `Você bateu a meta diária hoje. Continue assim!`;
        sendPush = true;
      } else if (freezes > 0) {
        newCurrent = current + 1;
        newLongest = Math.max(longest, newCurrent);
        newFreezes = freezes - 1;
        frozen++;

        type = 'reading_streak_frozen';
        title = `❄️ Gelinho salvou sua sequência!`;
        content = `Você não bateu a meta hoje, mas um gelinho cobriu. Sequência de ${newCurrent} dias continua! Restam ${newFreezes} gelinho(s).`;
        sendPush = true;
      } else if (current > 0) {
        const brokenStreak = current;
        newCurrent = 0;
        broken++;

        type = 'reading_streak_broken';
        title = `💔 Sua sequência de leitura zerou`;
        content = `Faltou gelinho pra cobrir o dia sem leitura. A sequência de ${brokenStreak} dias zerou - hora de começar outra!`;
        sendPush = false;
      } else {
        unchanged++;
      }

      updates.push({
        user_id: p.user_id,
        reading_streak_current: newCurrent,
        reading_streak_longest: newLongest,
        reading_streak_freezes: newFreezes,
        reading_streak_last_evaluated: todayBrt,
      });

      if (type && wantsNotif(p.notification_preferences)) {
        notificationRows.push({ user_id: p.user_id, type, title, content, related_id: null });
        if (sendPush) pushTargets.push({ userId: p.user_id, title, body: content });
      }
    }

    if (updates.length > 0) {
      const { error: upsertError } = await supabaseAdmin.from('profiles').upsert(updates, { onConflict: 'user_id' });
      if (upsertError) throw upsertError;
    }

    if (notificationRows.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('notifications').insert(notificationRows);
      if (insertError) console.error('Failed to insert reading streak notifications', insertError);
    }

    let pushSent = 0;
    if (vapidPublicKey && vapidPrivateKey && pushTargets.length > 0) {
      const targetUserIds = Array.from(new Set(pushTargets.map((t) => t.userId)));
      const { data: subscriptions } = await supabaseAdmin
        .from('push_subscriptions')
        .select('user_id, subscription')
        .in('user_id', targetUserIds);

      const messageByUser = new Map(pushTargets.map((t) => [t.userId, t]));
      for (const sub of subscriptions || []) {
        const target = messageByUser.get(sub.user_id);
        if (!target) continue;

        const payload = JSON.stringify({
          title: target.title,
          body: target.body,
          tag: `reading-streak-${todayBrt}`,
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
      JSON.stringify({ success: true, extended, frozen, broken, unchanged, pushSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
