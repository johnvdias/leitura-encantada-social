import { supabase } from "@/integrations/supabase/client";

export type NotificationCategory = 'likes' | 'comments' | 'friends' | 'nudges' | 'achievements' | 'loans' | 'messages';

export const DEFAULT_NOTIFICATION_PREFERENCES: Record<NotificationCategory, boolean> = {
  likes: true,
  comments: true,
  friends: true,
  nudges: true,
  achievements: true,
  loans: true,
  messages: true,
};

// Só bloqueia quando o dono do perfil desativou explicitamente a categoria
// (chave === false). Qualquer outro caso (perfil sem preferências salvas,
// erro de leitura, categoria desconhecida) deixa a notificação passar.
export const isCategoryEnabled = (
  preferences: unknown,
  category: NotificationCategory
): boolean => {
  if (!preferences || typeof preferences !== 'object') return true;
  const value = (preferences as Record<string, unknown>)[category];
  return value !== false;
};

export const shouldNotify = async (
  userId: string,
  category: NotificationCategory
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return true;
    return isCategoryEnabled(data.notification_preferences, category);
  } catch {
    return true;
  }
};
