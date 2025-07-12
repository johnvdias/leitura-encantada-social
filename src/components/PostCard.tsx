
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share, BookOpen, Sparkles, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface PostCardProps {
  post: {
    id: string;
    content: string;
    post_type: string;
    created_at: string;
    user_id: string;
    book_id?: string;
  };
  author?: {
    display_name?: string;
    avatar_url?: string;
  };
  book?: {
    title: string;
    author: string;
    genre?: string;
  };
  onUpdate?: () => void;
}

export const PostCard = ({ post, author, book, onUpdate }: PostCardProps) => {
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchPostStats();
  }, [post.id]);

  const fetchPostStats = async () => {
    try {
      // Fetch likes count
      const { count: likesCount } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      // Fetch comments count
      const { count: commentsCount } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      // Check if user liked this post
      if (user) {
        const { data: userLike } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .single();

        setIsLiked(!!userLike);
      }

      setLikes(likesCount || 0);
      setComments(commentsCount || 0);
    } catch (error) {
      console.error('Error fetching post stats:', error);
    }
  };

  const handleLike = async () => {
    if (!user || loading) return;

    setLoading(true);
    try {
      if (isLiked) {
        // Remove like
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);

        if (error) throw error;
        setLikes(prev => prev - 1);
        setIsLiked(false);
      } else {
        // Add like
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: post.id,
            user_id: user.id
          });

        if (error) throw error;
        setLikes(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Erro",
        description: "Não foi possível curtir o post",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPostTypeInfo = (type: string) => {
    switch (type) {
      case 'progress':
        return { icon: BookOpen, label: 'Progresso', color: 'bg-blue-100 text-blue-800' };
      case 'review':
        return { icon: Heart, label: 'Resenha', color: 'bg-pink-100 text-pink-800' };
      case 'recommendation':
        return { icon: Lightbulb, label: 'Recomendação', color: 'bg-yellow-100 text-yellow-800' };
      default:
        return { icon: Sparkles, label: 'Geral', color: 'bg-purple-100 text-purple-800' };
    }
  };

  const postTypeInfo = getPostTypeInfo(post.post_type);
  const PostIcon = postTypeInfo.icon;

  return (
    <Card className="card-enchanted mb-6">
      <CardContent className="p-6">
        {/* Author Info */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={author?.avatar_url} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {author?.display_name?.charAt(0) || "L"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{author?.display_name || "Leitora Anônima"}</p>
              <Badge className={postTypeInfo.color}>
                <PostIcon className="w-3 h-3 mr-1" />
                {postTypeInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(post.created_at).toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {/* Book Info */}
        {book && (
          <div className="bg-muted/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="font-medium text-primary">{book.title}</span>
              <span className="text-sm text-muted-foreground">por {book.author}</span>
            </div>
            {book.genre && (
              <Badge variant="secondary" className="text-xs">
                {book.genre}
              </Badge>
            )}
          </div>
        )}

        {/* Content */}
        <p className="mb-4 leading-relaxed whitespace-pre-wrap">{post.content}</p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`text-muted-foreground hover:text-red-500 ${isLiked ? 'text-red-500' : ''}`}
              onClick={handleLike}
              disabled={loading}
            >
              <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
              {likes}
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              <MessageCircle className="w-4 h-4 mr-1" />
              {comments}
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
