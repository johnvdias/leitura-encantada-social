import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/integrations/supabase/types";

type Post = Tables<'posts'> & {
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  books: {
    title: string | null;
    author: string | null;
  } | null;
  user: {
    display_name: string;
    avatar_url: string | null;
    user_id: string;
  };
};

export const useFeed = (filter: 'all' | 'friends' | 'clubs' = 'all') => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const { user } = useAuth();

  const fetchPosts = useCallback(async (loadMore = false) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles(
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

      const currentPage = loadMore ? page : 0;
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(currentPage * 10, (currentPage + 1) * 10 - 1);

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
          avatar_url: post.profiles?.avatar_url ?? null,
          user_id: post.user_id
        }
      })) || [];

      console.log("Transformed posts:", transformedPosts);
      
      if (loadMore) {
        setPosts(prev => [...prev, ...transformedPosts]);
      } else {
        setPosts(transformedPosts);
        setPage(0);
      }
      
      setHasMore(transformedPosts.length === 10);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError("Não foi possível carregar o feed. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  }, [user, filter, page]);

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
  }, [fetchPosts]);

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
  }, [fetchPosts]);

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  return {
    posts,
    loading,
    error,
    hasMore,
    createPost,
    loadMore,
    refetch: fetchPosts
  };
};