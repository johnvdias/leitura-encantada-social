
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LikeButton } from "@/components/LikeButton";
import { CommentSection } from "@/components/CommentSection";

interface PostCardProps {
  id: string;
  content: string;
  user: {
    display_name: string;
    avatar_url?: string;
  };
  book?: {
    title: string;
    author: string;
  };
  created_at: string;
  post_type: string;
}

const PostCard = ({ id, content, user, book, created_at, post_type }: PostCardProps) => {
  const getPostTypeLabel = (type: string) => {
    switch (type) {
      case 'review': return 'Resenha';
      case 'progress': return 'Progresso';
      case 'recommendation': return 'Recomendação';
      default: return 'Post';
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'review': return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'progress': return 'bg-green-500/20 text-green-700 dark:text-green-300';
      case 'recommendation': return 'bg-purple-500/20 text-purple-700 dark:text-purple-300';
      default: return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <Card className="card-enchanted hover-float">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback>
              {user.display_name?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{user.display_name}</span>
              <Badge className={getPostTypeColor(post_type)}>
                {getPostTypeLabel(post_type)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(created_at), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {book && (
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <BookOpen className="w-4 h-4 text-primary" />
            <div>
              <span className="font-medium">{book.title}</span>
              <span className="text-muted-foreground"> por {book.author}</span>
            </div>
          </div>
        )}

        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4">
            <LikeButton postId={id} />
          </div>
        </div>

        <CommentSection postId={id} />
      </CardContent>
    </Card>
  );
};

export default PostCard;
