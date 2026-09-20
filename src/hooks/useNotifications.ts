
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/integrations/supabase/types";

type NotificationRow = Tables<'notifications'>;

export type Notification = NotificationRow & {
  senderProfile: { display_name: string | null; avatar_url: string | null } | null;
};

// Tipos cujo related_id aponta pra outra usuária (quem curtiu, cutucou,
// mandou a mensagem etc.) - os únicos pra que faz sentido buscar o
// perfil e mostrar nome+foto na notificação. Os outros related_id
// apontam pra outras coisas (post, empréstimo) ou não existem.
const SENDER_TYPES = new Set(['message', 'nudge', 'friend_request', 'friend_accepted']);

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const rows = data || [];
      const senderIds = Array.from(
        new Set(
          rows
            .filter((n) => SENDER_TYPES.has(n.type) && n.related_id)
            .map((n) => n.related_id as string)
        )
      );

      const profilesMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      if (senderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', senderIds);
        profilesData?.forEach((p) => profilesMap.set(p.user_id, p));
      }

      const enriched = rows.map((n) => ({
        ...n,
        senderProfile: n.related_id ? profilesMap.get(n.related_id) || null : null,
      }));

      setNotifications(enriched);
      setUnreadCount(rows.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
};
