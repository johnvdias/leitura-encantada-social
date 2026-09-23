
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { shouldNotify } from "@/lib/notificationPreferences";

type Like = Tables<'post_likes'>;

export const useLikes = (postId: string) => {
  const [likes, setLikes] = useState<Like[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchLikes = useCallback(async () => {
    if (!postId) return;

    try {
      const { data, error } = await supabase
        .from('post_likes')
        .select('*')
        .eq('post_id', postId);

      if (error) throw error;

      setLikes(data || []);
      setIsLiked(user ? data?.some(like => like.user_id === user.id) : false);
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  }, [postId, user]);

  const toggleLike = async () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para curtir posts",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (isLiked) {
        // Remove like
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Add like
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          });

        if (error) throw error;

        // Create notification for post author
        const { data: postData } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', postId)
          .single();

        if (postData && postData.user_id !== user.id && await shouldNotify(postData.user_id, 'likes')) {
          await supabase
            .from('notifications')
            .insert({
              user_id: postData.user_id,
              type: 'like',
              title: 'Nova curtida!',
              content: 'Alguém curtiu seu post',
              related_id: postId
            });

          supabase.functions
            .invoke('send-push-notification', {
              body: {
                targetUserId: postData.user_id,
                title: 'Nova curtida!',
                body: 'Alguém curtiu seu post',
                tag: `like-${postId}`,
              },
            })
            .catch(() => {
              // Push é best-effort; a notificação in-app já foi salva.
            });
        }
      }

      await fetchLikes();
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Erro",
        description: "Não foi possível curtir o post",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLikes();
  }, [fetchLikes]);

  // Curtidas de outros usuários no mesmo post atualizam a contagem sozinhas,
  // sem precisar recarregar a página.
  useEffect(() => {
    if (!postId) return;

    const channel = supabase
      .channel(`likes-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes',
          filter: `post_id=eq.${postId}`
        },
        () => {
          fetchLikes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, fetchLikes]);

  return {
    likes,
    isLiked,
    loading,
    toggleLike,
    likesCount: likes.length
  };
};
