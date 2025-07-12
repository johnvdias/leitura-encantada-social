
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFeed = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchFeed = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch posts with author and book information
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            display_name,
            avatar_url
          ),
          books (
            title,
            author,
            genre
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setPosts(postsData || []);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [user]);

  return {
    posts,
    loading,
    refetch: fetchFeed
  };
};
