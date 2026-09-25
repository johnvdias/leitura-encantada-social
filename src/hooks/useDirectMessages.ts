import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { shouldNotify } from "@/lib/notificationPreferences";

type DirectMessage = Tables<'direct_messages'>;

export const useDirectMessages = (otherUserId: string | undefined) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const markThreadAsRead = useCallback(async () => {
    if (!user || !otherUserId) return;
    await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', otherUserId)
      .eq('recipient_id', user.id)
      .is('read_at', null);
  }, [user, otherUserId]);

  const fetchMessages = useCallback(async () => {
    if (!user || !otherUserId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      await markThreadAsRead();
    } catch (error) {
      console.error('Error fetching direct messages:', error);
    } finally {
      setLoading(false);
    }
  }, [user, otherUserId, markThreadAsRead]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!user || !otherUserId) return;

    const channel = supabase
      .channel(`direct-messages-${[user.id, otherUserId].sort().join('-')}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const row = (payload.new || payload.old) as DirectMessage | undefined;
          if (!row) return;
          const involvesThread =
            (row.sender_id === user.id && row.recipient_id === otherUserId) ||
            (row.sender_id === otherUserId && row.recipient_id === user.id);
          if (involvesThread) fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherUserId, fetchMessages]);

  const sendMessage = async (content: string) => {
    if (!user || !otherUserId || !content.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.from('direct_messages').insert({
        sender_id: user.id,
        recipient_id: otherUserId,
        content: content.trim(),
      });
      if (error) throw error;

      if (await shouldNotify(otherUserId, 'messages')) {
        const senderName = profile?.display_name || 'Alguém';
        const notificationTitle = `💬 ${senderName}`;

        await supabase.from('notifications').insert({
          user_id: otherUserId,
          type: 'message',
          title: notificationTitle,
          content: content.trim().slice(0, 120),
          related_id: user.id,
        });

        supabase.functions
          .invoke('send-push-notification', {
            body: {
              targetUserId: otherUserId,
              type: 'message',
              relatedId: user.id,
              tag: `dm-${user.id}-${otherUserId}`,
            },
          })
          .catch(() => {
            // Push é best-effort; a mensagem in-app já foi salva.
          });
      }

      await fetchMessages();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível enviar a mensagem.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return { messages, loading, sending, sendMessage, refetch: fetchMessages };
};
