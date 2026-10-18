import { supabase } from "@/integrations/supabase/client";
import { shouldNotify } from "@/lib/notificationPreferences";

// Mesmo padrão de NudgeButton/useAchievements: insere a notificação in-app
// (que também autoriza o push via RLS, ver send-push-notification) e dispara
// o push em paralelo, sem bloquear a UI - notificar é best-effort.
const notifyFriendsGoalReached = async (userId: string, displayName: string | null) => {
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error || !friendships || friendships.length === 0) return;

  const friendIds = friendships.map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );

  const title = `${displayName || 'Sua amiga'} bateu a meta diária! 🔥`;
  const content = 'Que inspiração! Que tal ler um pouquinho também?';

  for (const friendId of friendIds) {
    if (!(await shouldNotify(friendId, 'goal_streak'))) continue;

    await supabase.from('notifications').insert({
      user_id: friendId,
      type: 'goal_reached',
      title,
      content,
      related_id: userId,
    });

    supabase.functions
      .invoke('send-push-notification', {
        body: {
          targetUserId: friendId,
          type: 'goal_reached',
          relatedId: userId,
          tag: `goal-reached-${userId}-${friendId}`,
        },
      })
      .catch(() => {
        // Push é best-effort; a notificação in-app já foi salva.
      });
  }
};

// Chamado depois de registrar uma sessão de leitura: verifica se as páginas
// lidas hoje cruzaram a meta diária agora - e não já estavam acima dela antes
// dessa sessão, pra não notificar de novo a cada atualização do dia - e, se
// sim, avisa as amigas.
export const checkAndNotifyDailyGoalReached = async (userId: string, pagesReadNow: number) => {
  const { data: profileData } = await supabase
    .from('profiles')
    .select('reading_goal, display_name')
    .eq('user_id', userId)
    .maybeSingle();

  const dailyGoal = profileData?.reading_goal || 10;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: historyToday } = await supabase
    .from('reading_history')
    .select('pages_read')
    .eq('user_id', userId)
    .gte('created_at', todayStart.toISOString());

  const totalToday = historyToday?.reduce((sum, r) => sum + (r.pages_read || 0), 0) || 0;
  const totalBefore = totalToday - pagesReadNow;

  if (totalBefore < dailyGoal && totalToday >= dailyGoal) {
    await notifyFriendsGoalReached(userId, profileData?.display_name ?? null);
  }
};
