
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { shouldNotify } from "@/lib/notificationPreferences";

type CommentLike = Tables<'comment_likes'>;

export const useCommentLikes = (commentId: string) => {
  const [likes, setLikes] = useState<CommentLike[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchLikes = useCallback(async () => {
    if (!commentId) return;

    try {
      const { data, error } = await supabase
        .from('comment_likes')
        .select('*')
        .eq('comment_id', commentId);

      if (error) throw error;

      setLikes(data || []);
      setIsLiked(user ? data?.some(like => like.user_id === user.id) : false);
    } catch (error) {
      console.error('Error fetching comment likes:', error);
    }
  }, [commentId, user]);

  const toggleLike = async () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logada para curtir comentários",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });

        if (error) throw error;

        const { data: commentData } = await supabase
          .from('post_comments')
          .select('user_id, post_id')
          .eq('id', commentId)
          .single();

        if (commentData && commentData.user_id !== user.id && await shouldNotify(commentData.user_id, 'likes')) {
          await supabase
            .from('notifications')
            .insert({
              user_id: commentData.user_id,
              type: 'comment_like',
              title: 'Curtida no seu comentário!',
              content: 'Alguém curtiu seu comentário',
              related_id: commentData.post_id
            });

          supabase.functions
            .invoke('send-push-notification', {
              body: {
                targetUserId: commentData.user_id,
                type: 'comment_like',
                relatedId: commentData.post_id,
                tag: `comment_like-${commentId}`,
              },
            })
            .catch(() => {
              // Push é best-effort; a notificação in-app já foi salva.
            });
        }
      }

      await fetchLikes();
    } catch (error) {
      console.error('Error toggling comment like:', error);
      toast({
        title: "Erro",
        description: "Não foi possível curtir o comentário",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLikes();
  }, [fetchLikes]);

  // Curtidas de outras usuárias no mesmo comentário atualizam a contagem
  // sozinhas, sem precisar recarregar a página.
  useEffect(() => {
    if (!commentId) return;

    const channel = supabase
      .channel(`comment-likes-${commentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_likes',
          filter: `comment_id=eq.${commentId}`
        },
        () => {
          fetchLikes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [commentId, fetchLikes]);

  return {
    isLiked,
    loading,
    toggleLike,
    likesCount: likes.length
  };
};
