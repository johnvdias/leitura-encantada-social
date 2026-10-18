import { Tables } from "@/integrations/supabase/types";

type Notification = Tables<'notifications'>;

// Pra onde clicar numa notificação deve levar, baseado no seu tipo e no
// related_id salvo no momento em que ela foi criada (ver useLikes,
// useComments, useFriendships, useDirectMessages, NudgeButton e
// useAchievements - cada um decide o que related_id significa).
export const getNotificationLink = (notification: Notification): string | null => {
  const { type, related_id } = notification;

  switch (type) {
    case 'like':
    case 'comment':
    case 'mention':
      return related_id ? `/post/${related_id}` : null;
    case 'friend_request':
    case 'friend_accepted':
    case 'nudge':
    case 'goal_reached':
      return related_id ? `/perfil/${related_id}` : null;
    case 'message':
      return related_id ? `/mensagens/${related_id}` : null;
    case 'achievement':
      return '/perfil?tab=conquistas';
    case 'daily_reminder':
    case 'streak_invite':
    case 'streak_accepted':
    case 'streak_extended':
    case 'streak_frozen':
    case 'streak_broken':
    case 'friend_schedule_extended':
    case 'friend_schedule_frozen':
    case 'friend_schedule_broken':
      return '/estante';
    case 'club_schedule_extended':
    case 'club_schedule_frozen':
    case 'club_schedule_broken':
      return related_id ? `/clubes/${related_id}` : null;
    default:
      return null;
  }
};
