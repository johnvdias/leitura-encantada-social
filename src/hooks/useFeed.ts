

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFeed = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey(
            display_name,
            avatar_url
          ),
          books (
            title,
            author
          )
        `)
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
