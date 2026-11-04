import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const MAX_FREEZES = 3;

type NotificationRow = { user_id: string; type: string; title: string; content: string; related_id: string | null };
type PushTarget = { userId: string; title: string; body: string };
type StructuredGoal = { unit?: string; total?: number; daily_target?: number };

const normalize = (s: string | null | undefined) => (s || '').trim().toLowerCase();

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

    // Mesmo segredo compartilhado do pg_cron usado nas outras functions de
    // cron (ver get_cron_secret) - essa function também não tem sessão de usuária.
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

    // Mesma convenção de fuso das outras functions de cron: público
    // majoritariamente brasileiro, BRT fixo em UTC-3 (sem horário de verão).
    const now = new Date();
    const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const todayBrt = brtNow.toISOString().slice(0, 10);
    const todayStartIso = `${todayBrt}T03:00:00.000Z`;
    // Fim do dia BRT = início do dia seguinte (03:00 UTC) menos 1ms.
    const todayEndIso = new Date(new Date(todayStartIso).getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails('mailto:notifications@leituraencantada.com', vapidPublicKey, vapidPrivateKey);
    }

    const notificationRows: NotificationRow[] = [];
    const pushTargets: PushTarget[] = [];
    let extended = 0;
    let frozen = 0;
    let broken = 0;

    // Avalia cronogramas de amigas (group_reading_schedules) ou de clube
    // (club_reading_schedules) - fogo quando TODAS as participantes batem a
    // meta diária do cronograma hoje (ou leem algo, pros cronogramas antigos
    // sem meta estruturada / em capítulos); um gelinho cobre cada uma que
    // não bateu.
    const processSchedules = async (kind: 'friend' | 'club') => {
      const table = kind === 'friend' ? 'group_reading_schedules' : 'club_reading_schedules';
      const participantsTable = kind === 'friend' ? 'schedule_participants' : 'club_schedule_participants';
      const scheduleIdCol = kind === 'friend' ? 'schedule_id' : 'club_schedule_id';

      const scheduleColumns = kind === 'club'
        ? 'id, name, book_id, club_id, reading_goal, start_date, end_date, current_streak, longest_streak, freezes_available, last_evaluated_date'
        : 'id, name, book_id, reading_goal, start_date, end_date, current_streak, longest_streak, freezes_available, last_evaluated_date';

      const { data: schedules, error: schedulesError } = await supabaseAdmin
        .from(table)
        .select(scheduleColumns)
        .not('book_id', 'is', null)
        .lte('start_date', todayEndIso)
        .gte('end_date', todayStartIso)
        .or(`last_evaluated_date.is.null,last_evaluated_date.neq.${todayBrt}`);

      if (schedulesError) throw schedulesError;
      if (!schedules || schedules.length === 0) return;

      const scheduleIds = schedules.map((s) => s.id);
      const { data: participantRows, error: participantsError } = await supabaseAdmin
        .from(participantsTable)
        .select(kind === 'friend' ? 'schedule_id, user_id, status' : 'club_schedule_id, user_id')
        .in(scheduleIdCol, scheduleIds);

      if (participantsError) throw participantsError;

      const participantsBySchedule = new Map<string, string[]>();
      for (const row of (participantRows || []) as Record<string, string>[]) {
        if (kind === 'friend' && row.status !== 'accepted') continue;
        const sid = row[scheduleIdCol];
        const arr = participantsBySchedule.get(sid) || [];
        arr.push(row.user_id);
        participantsBySchedule.set(sid, arr);
      }

      const allUserIds = Array.from(new Set(Array.from(participantsBySchedule.values()).flat()));
      if (allUserIds.length === 0) return;

      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, display_name, notification_preferences')
        .in('user_id', allUserIds);
      if (profilesError) throw profilesError;
      const profileById = new Map((profiles || []).map((p) => [p.user_id, p]));

      const wantsNotif = (userId: string) => {
        const prefs = profileById.get(userId)?.notification_preferences;
        if (!prefs || typeof prefs !== 'object') return true;
        return (prefs as Record<string, unknown>).duo_streak !== false;
      };

      // O livro de cada cronograma é só um book_id (de quem criou ou de
      // quem ganhou o sorteio) - cada participante tem seu PRÓPRIO livro na
      // estante pro mesmo título, nunca esse mesmo id. Casa por
      // título+autor normalizados, igual já é feito na exibição do
      // cronograma e no toast de meta batida, em vez de comparar
      // reading_history.book_id direto com schedule.book_id (isso fazia a
      // sequência só considerar a leitura de quem criou o cronograma,
      // ignorando todo mundo mais).
      const scheduleBookIds = Array.from(new Set(schedules.map((s) => s.book_id).filter(Boolean)));
      const { data: scheduleBooksData } = await supabaseAdmin
        .from('books')
        .select('id, title, author')
        .in('id', scheduleBookIds);
      const scheduleBookById = new Map((scheduleBooksData || []).map((b) => [b.id, b]));

      const { data: allMemberBooks } = await supabaseAdmin
        .from('books')
        .select('id, user_id, title, author')
        .in('user_id', allUserIds);

      for (const schedule of schedules) {
        const participantIds = participantsBySchedule.get(schedule.id) || [];
        if (participantIds.length === 0) continue;

        const scheduleBook = scheduleBookById.get(schedule.book_id);
        const targetTitle = normalize(scheduleBook?.title);
        const targetAuthor = normalize(scheduleBook?.author);

        const bookIdToUser = new Map<string, string>();
        for (const b of allMemberBooks || []) {
          if (normalize(b.title) === targetTitle && normalize(b.author) === targetAuthor) {
            bookIdToUser.set(b.id, b.user_id);
          }
        }
        const matchedBookIds = Array.from(bookIdToUser.keys());

        const pagesByUser = new Map<string, number>();
        const activeToday = new Set<string>();
        if (matchedBookIds.length > 0) {
          const { data: historyToday } = await supabaseAdmin
            .from('reading_history')
            .select('book_id, pages_read, reading_session_minutes')
            .in('book_id', matchedBookIds)
            .gte('created_at', todayStartIso);

          for (const row of historyToday || []) {
            const uid = bookIdToUser.get(row.book_id);
            if (!uid) continue;
            pagesByUser.set(uid, (pagesByUser.get(uid) || 0) + (row.pages_read || 0));
            if ((row.pages_read || 0) > 0 || (row.reading_session_minutes || 0) > 0) activeToday.add(uid);
          }
        }

        // Cronograma com meta estruturada em páginas (ver reading_goal:
        // {unit, total, daily_target}) exige bater a meta de verdade pra
        // contar o dia. Cronogramas antigos (texto livre) ou em capítulos
        // (sem dado pra medir exato, já que reading_history só registra
        // páginas) continuam só exigindo ter lido alguma coisa.
        const goal = schedule.reading_goal as StructuredGoal | null;
        const requiresTarget = !!goal && goal.unit === 'pages' && !!goal.daily_target;

        const metToday = (uid: string) =>
          requiresTarget ? (pagesByUser.get(uid) || 0) >= (goal!.daily_target as number) : activeToday.has(uid);

        const missing = participantIds.filter((uid) => !metToday(uid));
        const update: Record<string, unknown> = { last_evaluated_date: todayBrt };

        let type: string | null = null;
        let title = '';
        let content = '';
        let sendPush = false;

        if (missing.length === 0) {
          const newStreak = schedule.current_streak + 1;
          let freezes = schedule.freezes_available;
          if (newStreak % 7 === 0 && freezes < MAX_FREEZES) freezes += 1;

          update.current_streak = newStreak;
          update.longest_streak = Math.max(schedule.longest_streak, newStreak);
          update.freezes_available = freezes;
          update.last_extended_date = todayBrt;
          extended++;

          type = kind === 'friend' ? 'friend_schedule_extended' : 'club_schedule_extended';
          title = `🔥 ${schedule.name}: dia ${newStreak}!`;
          content = requiresTarget
            ? `Todas bateram a meta de hoje! A sequência do cronograma "${schedule.name}" continua.`
            : `Todo mundo leu hoje! A sequência do cronograma "${schedule.name}" continua.`;
          sendPush = true;
        } else if (schedule.freezes_available >= missing.length) {
          const newStreak = schedule.current_streak + 1;
          const freezes = schedule.freezes_available - missing.length;

          update.current_streak = newStreak;
          update.longest_streak = Math.max(schedule.longest_streak, newStreak);
          update.freezes_available = freezes;
          update.last_extended_date = todayBrt;
          frozen++;

          const missingNames = missing.map((id) => profileById.get(id)?.display_name || 'alguém').join(', ');
          type = kind === 'friend' ? 'friend_schedule_frozen' : 'club_schedule_frozen';
          title = `❄️ Gelinho salvou "${schedule.name}"!`;
          content = requiresTarget
            ? `${missingNames} não bateu a meta hoje, mas um gelinho cobriu. Sequência de ${newStreak} dias continua! Restam ${freezes} gelinho(s).`
            : `${missingNames} não leu hoje, mas um gelinho cobriu. Sequência de ${newStreak} dias continua! Restam ${freezes} gelinho(s).`;
          sendPush = true;
        } else if (schedule.current_streak > 0) {
          const brokenStreak = schedule.current_streak;
          update.current_streak = 0;
          broken++;

          type = kind === 'friend' ? 'friend_schedule_broken' : 'club_schedule_broken';
          title = `💔 "${schedule.name}" perdeu a sequência`;
          content = `Faltaram gelinhos pra cobrir quem não leu hoje. A sequência de ${brokenStreak} dias zerou.`;
          sendPush = false;
        }

        if (type) {
          const relatedId = kind === 'club' ? schedule.club_id : null;
          for (const uid of participantIds) {
            if (!wantsNotif(uid)) continue;
            notificationRows.push({ user_id: uid, type, title, content, related_id: relatedId });
            if (sendPush) pushTargets.push({ userId: uid, title, body: content });
          }
        }

        const { error: updateError } = await supabaseAdmin.from(table).update(update).eq('id', schedule.id);
        if (updateError) console.error(`Failed to update ${table}`, schedule.id, updateError);
      }
    };

    await processSchedules('friend');
    await processSchedules('club');

    if (notificationRows.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('notifications').insert(notificationRows);
      if (insertError) console.error('Failed to insert schedule streak notifications', insertError);
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
          tag: `schedule-streak-${todayBrt}`,
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
      JSON.stringify({ success: true, extended, frozen, broken, pushSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
