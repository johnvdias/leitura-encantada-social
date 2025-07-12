
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Send } from "lucide-react";
import { useComments } from "@/hooks/useComments";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { comments, loading, submitting, addComment, commentsCount } = useComments(postId);
  const { user } = useAuth();

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    await addComment(newComment);
    setNewComment("");
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
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escreva um comentário..."
                  rows={2}
                  className="resize-none"
                />
                <Button type="submit" size="sm" disabled={submitting || !newComment.trim()}>
                  <Send className="h-3 w-3 mr-1" />
                  {submitting ? "Enviando..." : "Comentar"}
                </Button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center text-muted-foreground">Carregando comentários...</div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.profiles?.avatar_url} />
                    <AvatarFallback>
                      {comment.profiles?.display_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="font-medium text-sm">
                        {comment.profiles?.display_name || 'Usuário'}
                      </div>
                      <div className="text-sm">{comment.content}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
