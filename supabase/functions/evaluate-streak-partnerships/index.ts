import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const MAX_FREEZES = 3;

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

    // Mesmo segredo compartilhado do pg_cron usado em send-daily-goal-reminders
    // (ver get_cron_secret) - essa function também não tem sessão de usuária.
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

    // Mesma convenção de fuso usada em send-daily-goal-reminders: público
    // majoritariamente brasileiro, BRT fixo em UTC-3 (sem horário de verão).
    const now = new Date();
    const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const todayBrt = brtNow.toISOString().slice(0, 10);
    const todayStartIso = `${todayBrt}T03:00:00.000Z`;

    const { data: partnerships, error: partnershipsError } = await supabaseAdmin
      .from('streak_partnerships')
      .select('id, user_a_id, user_b_id, current_streak, longest_streak, freezes_available, last_evaluated_date')
      .eq('status', 'active')
      .or(`last_evaluated_date.is.null,last_evaluated_date.neq.${todayBrt}`);

    if (partnershipsError) throw partnershipsError;

    if (!partnerships || partnerships.length === 0) {
      return new Response(JSON.stringify({ success: true, evaluated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userIds = Array.from(new Set(partnerships.flatMap((p) => [p.user_a_id, p.user_b_id])));

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, reading_goal, notification_preferences')
      .in('user_id', userIds);
    if (profilesError) throw profilesError;
    const profileById = new Map((profiles || []).map((p) => [p.user_id, p]));

    const wantsNotif = (userId: string) => {
      const prefs = profileById.get(userId)?.notification_preferences;
      if (!prefs || typeof prefs !== 'object') return true;
      return (prefs as Record<string, unknown>).duo_streak !== false;
    };

    const { data: historyToday, error: historyError } = await supabaseAdmin
      .from('reading_history')
      .select('user_id, pages_read')
      .in('user_id', userIds)
      .gte('created_at', todayStartIso);
    if (historyError) throw historyError;

    const pagesTodayByUser = new Map<string, number>();
    for (const row of historyToday || []) {
      pagesTodayByUser.set(row.user_id, (pagesTodayByUser.get(row.user_id) || 0) + (row.pages_read || 0));
    }

    const metGoal = (userId: string) => {
      const goal = profileById.get(userId)?.reading_goal || 10;
      const pages = pagesTodayByUser.get(userId) || 0;
      return pages >= goal;
    };

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails('mailto:notifications@leituraencantada.com', vapidPublicKey, vapidPrivateKey);
    }

    const notificationRows: { user_id: string; type: string; title: string; content: string; related_id: string | null }[] = [];
    const pushTargets: { userId: string; title: string; body: string }[] = [];
    let extended = 0;
    let frozen = 0;
    let broken = 0;

    const notifyBoth = (partnership: { user_a_id: string; user_b_id: string }, type: string, title: string, content: string) => {
      if (wantsNotif(partnership.user_a_id)) {
        notificationRows.push({ user_id: partnership.user_a_id, type, title, content, related_id: partnership.user_b_id });
        pushTargets.push({ userId: partnership.user_a_id, title, body: content });
      }
      if (wantsNotif(partnership.user_b_id)) {
        notificationRows.push({ user_id: partnership.user_b_id, type, title, content, related_id: partnership.user_a_id });
        pushTargets.push({ userId: partnership.user_b_id, title, body: content });
      }
    };

    for (const partnership of partnerships) {
      const nameA = profileById.get(partnership.user_a_id)?.display_name || 'Sua parceira';
      const nameB = profileById.get(partnership.user_b_id)?.display_name || 'Sua parceira';
      const metA = metGoal(partnership.user_a_id);
      const metB = metGoal(partnership.user_b_id);

      const update: Record<string, unknown> = { last_evaluated_date: todayBrt };

      if (metA && metB) {
        const newStreak = partnership.current_streak + 1;
        let freezes = partnership.freezes_available;
        if (newStreak % 7 === 0 && freezes < MAX_FREEZES) freezes += 1;

        update.current_streak = newStreak;
        update.longest_streak = Math.max(partnership.longest_streak, newStreak);
        update.freezes_available = freezes;
        update.last_extended_date = todayBrt;
        extended++;

        const title = `🔥 Ofensiva em dupla: dia ${newStreak}!`;
        const content = `Vocês duas bateram a meta hoje. Continuem assim!`;
        notifyBoth(partnership, 'streak_extended', title, content);
      } else if (partnership.freezes_available > 0) {
        const newStreak = partnership.current_streak + 1;
        const freezes = partnership.freezes_available - 1;

        update.current_streak = newStreak;
        update.longest_streak = Math.max(partnership.longest_streak, newStreak);
        update.freezes_available = freezes;
        update.last_extended_date = todayBrt;
        frozen++;

        const missedName = !metA ? nameA : nameB;
        const title = `❄️ Um gelinho salvou a ofensiva de vocês!`;
        const content = `${missedName} não bateu a meta hoje, mas um gelinho cobriu o dia. Sequência de ${newStreak} dias continua! Restam ${freezes} gelinho(s).`;
        notifyBoth(partnership, 'streak_frozen', title, content);
      } else if (partnership.current_streak > 0) {
        update.current_streak = 0;
        broken++;

        const missedName = !metA && !metB ? 'Vocês duas' : !metA ? nameA : nameB;
        const title = `💔 A ofensiva em dupla acabou`;
        const content = `${missedName} não bateu a meta e não havia gelinho disponível. A sequência de ${partnership.current_streak} dias zerou - bora começar de novo?`;
        if (wantsNotif(partnership.user_a_id)) {
          notificationRows.push({ user_id: partnership.user_a_id, type: 'streak_broken', title, content, related_id: partnership.user_b_id });
        }
        if (wantsNotif(partnership.user_b_id)) {
          notificationRows.push({ user_id: partnership.user_b_id, type: 'streak_broken', title, content, related_id: partnership.user_a_id });
        }
      }
      // Se current_streak já era 0 e ninguém bateu a meta, não há nada de
      // novo a comunicar - só atualiza last_evaluated_date mais abaixo.

      const { error: updateError } = await supabaseAdmin
        .from('streak_partnerships')
        .update(update)
        .eq('id', partnership.id);
      if (updateError) console.error('Failed to update partnership', partnership.id, updateError);
    }

    if (notificationRows.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('notifications').insert(notificationRows);
      if (insertError) console.error('Failed to insert streak notifications', insertError);
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
          tag: `streak-${todayBrt}`,
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
      JSON.stringify({ success: true, evaluated: partnerships.length, extended, frozen, broken, pushSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
