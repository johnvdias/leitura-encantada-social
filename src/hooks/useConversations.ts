import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFriendships } from "@/hooks/useFriendships";
import { Tables } from "@/integrations/supabase/types";

type DirectMessage = Tables<'direct_messages'>;

export interface Conversation {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  lastMessage: DirectMessage | null;
  unreadCount: number;
}

export const useConversations = () => {
  const { user } = useAuth();
  const { friends, loading: friendsLoading } = useFriendships();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: messages, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const byUser = new Map<string, { lastMessage: DirectMessage; unreadCount: number }>();
      (messages || []).forEach((msg) => {
        const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        const entry = byUser.get(otherId);
        const isUnread = msg.recipient_id === user.id && !msg.read_at;
        if (!entry) {
          byUser.set(otherId, { lastMessage: msg, unreadCount: isUnread ? 1 : 0 });
        } else if (isUnread) {
          entry.unreadCount += 1;
        }
      });

      const list: Conversation[] = friends.map((f) => {
        const entry = byUser.get(f.friend.user_id);
        return {
          userId: f.friend.user_id,
          displayName: f.friend.display_name,
          avatarUrl: f.friend.avatar_url,
          lastMessage: entry?.lastMessage || null,
          unreadCount: entry?.unreadCount || 0,
        };
      });

      list.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
      });

      setConversations(list);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user, friends]);

  useEffect(() => {
    if (!friendsLoading) fetchConversations();
  }, [friendsLoading, fetchConversations]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('direct-messages-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages' },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return { conversations, loading: loading || friendsLoading, totalUnread, refetch: fetchConversations };
};
