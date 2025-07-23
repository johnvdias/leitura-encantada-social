
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type Comment = Tables<'post_comments'> & {
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export const useComments = (postId: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchComments = useCallback(async () => {
    if (!postId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const addComment = async (content: string) => {
    if (!user || !content.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: content.trim()
        });

      if (error) throw error;

      // Create notification for post author
      const { data: postData } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      if (postData && postData.user_id !== user.id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: postData.user_id,
            type: 'comment',
            title: 'Novo comentário!',
            content: 'Alguém comentou em seu post',
            related_id: postId
          });
      }

      await fetchComments();
      toast({
        title: "Comentário adicionado! 💬",
        description: "Seu comentário foi publicado com sucesso"
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o comentário",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    loading,
    submitting,
    addComment,
    commentsCount: comments.length,
    refetch: fetchComments
  };
};
