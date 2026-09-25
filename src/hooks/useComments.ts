
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { shouldNotify } from "@/lib/notificationPreferences";

type Comment = Tables<'post_comments'> & {
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
};

export type CommentWithReplies = Comment & { replies: Comment[] };

const MENTION_REGEX = /@([a-zA-Z0-9_.]+)/g;

export const useComments = (postId: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user, profile } = useAuth();
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
            avatar_url,
            username
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

  // Agrupa em nível único (como Instagram): comentários de topo com suas
  // respostas diretas. Uma resposta a uma resposta é anexada ao comentário
  // de topo original (menção em texto indica pra quem é a resposta).
  const threadedComments = useMemo<CommentWithReplies[]>(() => {
    const topLevel = comments.filter((c) => !c.parent_comment_id);
    return topLevel.map((comment) => ({
      ...comment,
      replies: comments.filter((c) => c.parent_comment_id === comment.id),
    }));
  }, [comments]);

  const notifyMentions = useCallback(async (content: string, excludeUserId: string) => {
    const handles = Array.from(
      new Set(Array.from(content.matchAll(MENTION_REGEX), (m) => m[1]))
    );
    if (handles.length === 0) return;

    const { data: mentionedProfiles } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('username', handles);

    const targets = (mentionedProfiles || []).filter((p) => p.user_id !== excludeUserId);
    if (targets.length === 0) return;

    const notifiableTargets = (
      await Promise.all(
        targets.map(async (target) => ((await shouldNotify(target.user_id, 'comments')) ? target : null))
      )
    ).filter((t): t is (typeof targets)[number] => t !== null);
    if (notifiableTargets.length === 0) return;

    const mentionTitle = 'Você foi mencionado! 📣';
    const mentionBody = `${profile?.display_name || 'Alguém'} mencionou você em um comentário`;

    await supabase.from('notifications').insert(
      notifiableTargets.map((target) => ({
        user_id: target.user_id,
        type: 'mention',
        title: mentionTitle,
        content: mentionBody,
        related_id: postId
      }))
    );

    notifiableTargets.forEach((target) => {
      supabase.functions
        .invoke('send-push-notification', {
          body: {
            targetUserId: target.user_id,
            type: 'mention',
            relatedId: postId,
            tag: `mention-${postId}-${target.user_id}`,
          },
        })
        .catch(() => {
          // Push é best-effort; a notificação in-app já foi salva.
        });
    });
  }, [postId, profile?.display_name]);

  const addComment = async (content: string, parentCommentId?: string) => {
    if (!user || !content.trim()) return;

    setSubmitting(true);
    try {
      const { data: newComment, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: content.trim(),
          parent_comment_id: parentCommentId ?? null
        })
        .select(`
          *,
          profiles (
            display_name,
            avatar_url,
            username
          )
        `)
        .single();

      if (error) throw error;

      if (newComment) {
        setComments((prevComments) => [...prevComments, newComment]);
      }

      // Create notification for post author
      const { data: postData } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      if (postData && postData.user_id !== user.id && await shouldNotify(postData.user_id, 'comments')) {
        await supabase
          .from('notifications')
          .insert({
            user_id: postData.user_id,
            type: 'comment',
            title: 'Novo comentário!',
            content: 'Alguém comentou em seu post',
            related_id: postId
          });

        supabase.functions
          .invoke('send-push-notification', {
            body: {
              targetUserId: postData.user_id,
              type: 'comment',
              relatedId: postId,
              tag: `comment-${postId}`,
            },
          })
          .catch(() => {
            // Push é best-effort; a notificação in-app já foi salva.
          });
      }

      await notifyMentions(content, user.id);

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

  // Comentários de outros usuários no mesmo post aparecem sozinhos, sem
  // precisar recarregar a página.
  useEffect(() => {
    if (!postId) return;

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${postId}`
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, fetchComments]);

  return {
    comments: threadedComments,
    loading,
    submitting,
    addComment,
    commentsCount: comments.length,
    refetch: fetchComments
  };
};
