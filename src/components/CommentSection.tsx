
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Send, X } from "lucide-react";
import { useComments, CommentWithReplies } from "@/hooks/useComments";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MentionTextarea } from "@/components/MentionTextarea";
import { Tables } from "@/integrations/supabase/types";

interface CommentSectionProps {
  postId: string;
}

type Comment = Tables<'post_comments'> & {
  profiles: { display_name: string | null; avatar_url: string | null; username: string | null } | null;
};

interface ReplyTarget {
  parentId: string;
  displayName: string;
}

function CommentRow({ comment, onReply }: { comment: Comment; onReply: (target: ReplyTarget, topLevelId: string) => void }) {
  return (
    <div className="flex gap-2">
      <Avatar className="w-8 h-8">
        <AvatarImage src={comment.profiles?.avatar_url ?? undefined} />
        <AvatarFallback>
          {comment.profiles?.display_name?.[0] || '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="bg-muted rounded-lg p-3">
          <div className="font-medium text-sm">
            {comment.profiles?.display_name || 'Usuário'}
          </div>
          <div className="text-sm whitespace-pre-wrap">{comment.content}</div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(new Date(comment.created_at), {
              addSuffix: true,
              locale: ptBR
            })}
          </span>
          <button
            type="button"
            onClick={() => onReply(
              {
                parentId: comment.id,
                displayName: comment.profiles?.username || comment.profiles?.display_name || 'usuário'
              },
              comment.parent_comment_id || comment.id
            )}
            className="font-medium hover:underline"
          >
            Responder
          </button>
        </div>
      </div>
    </div>
  );
}

export function CommentSection({ postId }: CommentSectionProps) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ target: ReplyTarget; topLevelId: string } | null>(null);
  const { comments, loading, submitting, addComment, commentsCount } = useComments(postId);
  const { user } = useAuth();

  const handleReply = (target: ReplyTarget, topLevelId: string) => {
    setReplyTo({ target, topLevelId });
    setNewComment(`@${target.displayName} `);
    setShowComments(true);
  };

  const cancelReply = () => {
    setReplyTo(null);
    setNewComment("");
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    await addComment(newComment, replyTo?.topLevelId);
    setNewComment("");
    setReplyTo(null);
  };

  return (
    <div className="space-y-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowComments(!showComments)}
        className="flex items-center gap-1"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="text-sm">
          {commentsCount > 0 ? `${commentsCount} comentário${commentsCount > 1 ? 's' : ''}` : 'Comentar'}
        </span>
      </Button>

      {showComments && (
        <div className="space-y-4 border-t pt-4">
          {user && (
            <form onSubmit={handleSubmitComment} className="flex gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user.user_metadata?.display_name?.[0] || user.email?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                {replyTo && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    Respondendo a @{replyTo.target.displayName}
                    <button type="button" onClick={cancelReply} className="hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <MentionTextarea
                  value={newComment}
                  onChange={setNewComment}
                  placeholder="Escreva um comentário... use @ pra mencionar um amigo"
                  rows={2}
                  className="resize-none"
                />
                <Button type="submit" size="sm" disabled={submitting || !newComment.trim()}>
                  <Send className="h-3 w-3 mr-1" />
                  {submitting ? "Enviando..." : replyTo ? "Responder" : "Comentar"}
                </Button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center text-muted-foreground">Carregando comentários...</div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment: CommentWithReplies) => (
                <div key={comment.id} className="space-y-3">
                  <CommentRow comment={comment} onReply={handleReply} />
                  {comment.replies.length > 0 && (
                    <div className="pl-10 space-y-3">
                      {comment.replies.map((reply) => (
                        <CommentRow key={reply.id} comment={reply} onReply={handleReply} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
