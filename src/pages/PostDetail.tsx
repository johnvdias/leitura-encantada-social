import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import PostCard from "@/components/PostCard";
import { Tables } from "@/integrations/supabase/types";

type PostRow = Tables<'posts'> & {
  profiles: { display_name: string | null; avatar_url: string | null } | null;
  books: { title: string | null; author: string | null } | null;
  clubs: { name: string | null } | null;
};

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<PostRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles ( display_name, avatar_url ),
          books ( title, author ),
          clubs ( name )
        `)
        .eq('id', postId)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setPost(null);
      } else {
        setPost(data as PostRow);
      }
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/feed" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Voltar pro feed
      </Link>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : notFound || !post ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Esse post não existe mais, ou você não tem permissão pra vê-lo.
          </p>
          <Button asChild variant="outline">
            <Link to="/feed">Ir pro feed</Link>
          </Button>
        </div>
      ) : (
        <PostCard
          id={post.id}
          content={post.content}
          user={{
            display_name: post.profiles?.display_name || 'Usuária Anônima',
            avatar_url: post.profiles?.avatar_url ?? undefined,
            user_id: post.user_id,
          }}
          book={post.books ? { title: post.books.title ?? '', author: post.books.author ?? '' } : undefined}
          club={post.clubs?.name ? { name: post.clubs.name } : undefined}
          created_at={post.created_at}
          post_type={post.post_type}
          visibility={post.visibility}
          onPostDeleted={fetchPost}
        />
      )}
    </div>
  );
};

export default PostDetail;
