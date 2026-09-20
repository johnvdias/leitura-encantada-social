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
  clubs: {
    name: string | null;
  } | null;
  user: {
    display_name: string;
    avatar_url: string | null;
    user_id: string;
  };
};

const normalizeBookKey = (title: string, author: string) => `${title.trim().toLowerCase()}|${author.trim().toLowerCase()}`;

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
          ),
          clubs (
            name
          )
        `);

      if (filter === 'friends') {
        // Show posts (public or friends-only) authored by accepted friends
        const { data: friendships } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${user?.id},addressee_id.eq.${user?.id}`);

        const friendIds = (friendships || []).map(f =>
          f.requester_id === user?.id ? f.addressee_id : f.requester_id
        );

        // Inclui o próprio usuário: sem isso, a aba "Amigos" mostrava os
        // posts dos amigos mas escondia os posts "Apenas Amigas" do
        // próprio autor.
        const authorIds = user?.id ? [...friendIds, user.id] : friendIds;

        if (authorIds.length === 0) {
          setPosts([]);
          setHasMore(false);
          setLoading(false);
          return;
        }

        query = query.in('user_id', authorIds).in('visibility', ['public', 'friends']);
      } else if (filter === 'clubs') {
        // Mostra só o que é realmente sobre o clube: posts marcados
        // manualmente pra ele, ou posts (de qualquer membro) sobre o livro
        // que o clube está lendo no momento - não qualquer post público de
        // quem por acaso é membro de um clube com o usuário.
        const { data: myMemberships } = await supabase
          .from('club_members')
          .select('club_id')
          .eq('user_id', user?.id ?? '')
          .eq('status', 'approved');

        const clubIds = (myMemberships || []).map(m => m.club_id);

        if (clubIds.length === 0) {
          setPosts([]);
          setHasMore(false);
          setLoading(false);
          return;
        }

        const { data: clubMembers } = await supabase
          .from('club_members')
          .select('user_id')
          .in('club_id', clubIds)
          .eq('status', 'approved');

        const memberIds = Array.from(new Set((clubMembers || []).map(m => m.user_id)));

        // Livro atual de cada clube (dono + título/autora), pra achar posts
        // sobre a mesma leitura feitos por qualquer membro.
        const { data: clubsData } = await supabase
          .from('clubs')
          .select('id, current_book:books!clubs_current_book_id_fkey(title, author)')
          .in('id', clubIds);

        const currentReadKeys = new Set(
          (clubsData || [])
            .map((c) => c.current_book)
            .filter((b): b is { title: string; author: string } => !!b?.title && !!b?.author)
            .map((b) => normalizeBookKey(b.title, b.author))
        );

        let matchingBookIds: string[] = [];
        if (currentReadKeys.size > 0 && memberIds.length > 0) {
          const { data: memberBooks } = await supabase
            .from('books')
            .select('id, title, author')
            .in('user_id', memberIds);

          matchingBookIds = (memberBooks || [])
            .filter((b) => currentReadKeys.has(normalizeBookKey(b.title, b.author)))
            .map((b) => b.id);
        }

        const orParts = [`club_id.in.(${clubIds.join(',')})`];
        if (matchingBookIds.length > 0) {
          orParts.push(`book_id.in.(${matchingBookIds.join(',')})`);
        }

        query = query.in('user_id', memberIds).eq('visibility', 'public').or(orParts.join(','));
      } else {
        // Mostra os posts públicos de todo mundo, mais os próprios posts do
        // usuário logado mesmo quando não são públicos - sem isso, o autor
        // de um post "Apenas Amigas" não o via na própria aba "Todas".
        query = user?.id
          ? query.or(`visibility.eq.public,user_id.eq.${user.id}`)
          : query.eq('visibility', 'public');
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