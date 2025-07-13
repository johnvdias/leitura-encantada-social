import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Book, Profile } from "@/types";

interface RecommendationData {
  book: Book;
  reason: string;
  score: number;
  recommendedBy?: Profile;
}

export const useRecommendations = () => {
  const [recommendations, setRecommendations] = useState<RecommendationData[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchRecommendations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Buscar livros lidos pelo usuário para entender gostos
      const { data: userBooks, error: userBooksError } = await supabase
        .from("books")
        .select("genre, rating")
        .eq("user_id", user.id)
        .eq("reading_status", "completed")
        .gte("rating", 4); // Apenas livros bem avaliados

      if (userBooksError) throw userBooksError;

      // Encontrar gêneros favoritos
      const genreFrequency: Record<string, number> = {};
      userBooks?.forEach((book) => {
        if (book.genre) {
          genreFrequency[book.genre] = (genreFrequency[book.genre] || 0) + 1;
        }
      });

      const favoriteGenres = Object.entries(genreFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([genre]) => genre);

      // Buscar livros populares nos gêneros favoritos
      const recommendationsData: RecommendationData[] = [];

      if (favoriteGenres.length > 0) {
        const { data: popularBooks, error: popularBooksError } = await supabase
          .from("books")
          .select(
            `
            *,
            profiles!inner(display_name, avatar_url, user_id)
          `,
          )
          .in("genre", favoriteGenres)
          .neq("user_id", user.id)
          .gte("rating", 4)
          .order("rating", { ascending: false })
          .limit(5);

        if (!popularBooksError && popularBooks) {
          popularBooks.forEach((book) => {
            recommendationsData.push({
              book: book as Book,
              reason: `Baseado no seu gosto por ${book.genre}`,
              score: book.rating || 0,
              recommendedBy: book.profiles as Profile,
            });
          });
        }
      }

      // Buscar livros de amigos
      const { data: friendships, error: friendshipsError } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (!friendshipsError && friendships) {
        const friendIds = friendships.map((f) =>
          f.requester_id === user.id ? f.addressee_id : f.requester_id,
        );

        if (friendIds.length > 0) {
          const { data: friendBooks, error: friendBooksError } = await supabase
            .from("books")
            .select(
              `
              *,
              profiles!inner(display_name, avatar_url, user_id)
            `,
            )
            .in("user_id", friendIds)
            .eq("reading_status", "completed")
            .gte("rating", 4)
            .order("rating", { ascending: false })
            .limit(3);

          if (!friendBooksError && friendBooks) {
            friendBooks.forEach((book) => {
              // Evitar duplicatas
              if (
                !recommendationsData.some((r) => r.book.title === book.title)
              ) {
                recommendationsData.push({
                  book: book as Book,
                  reason: `Recomendado por ${book.profiles?.display_name || "um amigo"}`,
                  score: book.rating || 0,
                  recommendedBy: book.profiles as Profile,
                });
              }
            });
          }
        }
      }

      // Buscar livros trending (mais adicionados recentemente)
      const { data: trendingBooks, error: trendingError } = await supabase
        .from("books")
        .select(
          `
          title,
          author,
          genre,
          cover_url,
          description,
          COUNT(*) as popularity
        `,
        )
        .neq("user_id", user.id)
        .gte(
          "created_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        ) // Últimos 30 dias
        .group("title, author, genre, cover_url, description")
        .order("popularity", { ascending: false })
        .limit(2);

      if (!trendingError && trendingBooks) {
        trendingBooks.forEach((book: any) => {
          if (!recommendationsData.some((r) => r.book.title === book.title)) {
            recommendationsData.push({
              book: {
                id: `trending-${book.title}`,
                title: book.title,
                author: book.author,
                genre: book.genre,
                cover_url: book.cover_url,
                description: book.description,
                reading_status: "want_to_read",
                reading_progress: 0,
                pages: null,
                user_id: "",
                created_at: "",
                updated_at: "",
              } as Book,
              reason: `Trending - ${book.popularity} pessoas adicionaram recentemente`,
              score: book.popularity,
            });
          }
        });
      }

      // Ordenar por score e limitar
      const sortedRecommendations = recommendationsData
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      setRecommendations(sortedRecommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [user]);

  return {
    recommendations,
    loading,
    refetch: fetchRecommendations,
  };
};
