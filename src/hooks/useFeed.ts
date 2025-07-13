import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFeed = (filter: 'all' | 'friends' | 'clubs' = 'all') => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles!fk_posts_user_id(
            display_name,
            avatar_url
          ),
          books (
            title,
            author
          )
        `);

      if (filter === 'friends') {
        // Show only posts from friends (accepted friendships)
        query = query.or(`visibility.eq.public,and(visibility.eq.friends,user_id.in.(
          SELECT CASE 
            WHEN requester_id = '${user?.id}' THEN addressee_id 
            ELSE requester_id 
          END 
          FROM friendships 
          WHERE (requester_id = '${user?.id}' OR addressee_id = '${user?.id}') 
          AND status = 'accepted'
        ))`);
      } else if (filter === 'clubs') {
        // Show posts from club members (clubs the user is part of)
        query = query.in('user_id', [
          // This is a simplified version - in a real app you'd need a proper subquery
          // For now, just show public posts
        ]).eq('visibility', 'public');
      } else {
        // Show all public posts
        query = query.eq('visibility', 'public');
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Raw posts data:", data);

      // Transform the data to match our component expectations
      const transformedPosts = data?.map(post => ({
        ...post,
        user: {
          display_name: post.profiles?.display_name || 'Usuário Anônimo',
          avatar_url: post.profiles?.avatar_url
        }
      })) || [];

      console.log("Transformed posts:", transformedPosts);
      setPosts(transformedPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError("Não foi possível carregar o feed. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (content: string, bookId?: string, postType: string = 'general') => {
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content,
          book_id: bookId || null,
          post_type: postType,
          visibility: 'public'
        });

      if (error) throw error;

      // Refresh posts after creating
      await fetchPosts();
      return { success: true };
    } catch (error) {
      console.error("Error creating post:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [user]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    posts,
    loading,
    error,
    createPost,
    refetch: fetchPosts
  };
};
