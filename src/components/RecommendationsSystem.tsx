import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Star,
  Users,
  TrendingUp,
  Heart,
  Brain,
  Sparkles,
  Clock,
  ThumbsUp,
  BarChart3,
  UserCheck,
  Lightbulb,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
  genre: string;
  pages?: number;
  isbn?: string;
  description?: string;
}

interface Recommendation {
  book: Book;
  reason: string;
  score: number;
  type:
    | "genre_based"
    | "collaborative"
    | "trending"
    | "friend_based"
    | "similar_books";
  metadata?: any;
}

interface UserProfile {
  favorite_genres: string[];
  reading_preferences: any;
  completed_books: number;
  average_rating: number;
}

export function RecommendationsSystem() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [friendRecommendations, setFriendRecommendations] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personalized");

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      generateRecommendations();
      fetchTrendingBooks();
      fetchFriendRecommendations();
      analyzeUserProfile();
    }
  }, [user]);

  const analyzeUserProfile = async () => {
    if (!user) return;

    try {
      // Fetch user's reading history
      const { data: books } = await supabase
        .from("books")
        .select("genre, reading_status")
        .eq("user_id", user.id);

      // Fetch user's reviews for average rating
      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("user_id", user.id);

      if (books) {
        const genres = books.map((b) => b.genre).filter(Boolean);
        const genreCounts = genres.reduce(
          (acc, genre) => {
            acc[genre] = (acc[genre] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        const favoriteGenres = Object.entries(genreCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([genre]) => genre);

        const completedBooks = books.filter(
          (b) => b.reading_status === "completed",
        ).length;
        const averageRating =
          reviews && reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        setUserProfile({
          favorite_genres: favoriteGenres,
          reading_preferences: genreCounts,
          completed_books: completedBooks,
          average_rating: averageRating,
        });
      }
    } catch (error) {
      console.error("Error analyzing user profile:", error);
    }
  };

  const generateRecommendations = async () => {
    if (!user) return;

    try {
      // Get user's reading history and preferences
      const { data: userBooks } = await supabase
        .from("books")
        .select("genre, author")
        .eq("user_id", user.id)
        .eq("reading_status", "completed");

      if (!userBooks || userBooks.length === 0) {
        // New user - show popular books
        generateNewUserRecommendations();
        return;
      }

      const recommendations: Recommendation[] = [];

      // Genre-based recommendations
      const genres = [
        ...new Set(userBooks.map((b) => b.genre).filter(Boolean)),
      ];
      for (const genre of genres.slice(0, 2)) {
        const genreRecs = await getGenreBasedRecommendations(genre);
        recommendations.push(...genreRecs);
      }

      // Author-based recommendations
      const authors = [
        ...new Set(userBooks.map((b) => b.author).filter(Boolean)),
      ];
      for (const author of authors.slice(0, 2)) {
        const authorRecs = await getAuthorBasedRecommendations(author);
        recommendations.push(...authorRecs);
      }

      // Collaborative filtering (users with similar taste)
      const collaborativeRecs = await getCollaborativeRecommendations();
      recommendations.push(...collaborativeRecs);

      // Remove duplicates and books user already has
      const userBookIds = userBooks.map((b) => b.id);
      const uniqueRecs = recommendations
        .filter(
          (rec, index, self) =>
            index === self.findIndex((r) => r.book.id === rec.book.id) &&
            !userBookIds.includes(rec.book.id),
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);

      setRecommendations(uniqueRecs);
    } catch (error) {
      console.error("Error generating recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewUserRecommendations = async () => {
    // For new users, recommend popular books from various genres
    const popularGenres = [
      "Ficção",
      "Romance",
      "Mistério",
      "Fantasia",
      "Biografia",
    ];
    const recommendations: Recommendation[] = [];

    for (const genre of popularGenres) {
      const recs = await getGenreBasedRecommendations(genre, 2);
      recommendations.push(
        ...recs.map((rec) => ({
          ...rec,
          reason: `Popular em ${genre}`,
          type: "trending" as const,
        })),
      );
    }

    setRecommendations(recommendations.slice(0, 10));
    setLoading(false);
  };

  const getGenreBasedRecommendations = async (
    genre: string,
    limit = 3,
  ): Promise<Recommendation[]> => {
    try {
      // This would ideally query a larger book database
      // For now, we'll use books from other users as recommendations
      const { data: books } = await supabase
        .from("books")
        .select("*")
        .eq("genre", genre)
        .neq("user_id", user?.id)
        .limit(limit);

      return (books || []).map((book) => ({
        book,
        reason: `Baseado no seu interesse em ${genre}`,
        score: 0.8,
        type: "genre_based" as const,
      }));
    } catch (error) {
      console.error("Error fetching genre recommendations:", error);
      return [];
    }
  };

  const getAuthorBasedRecommendations = async (
    author: string,
    limit = 2,
  ): Promise<Recommendation[]> => {
    try {
      const { data: books } = await supabase
        .from("books")
        .select("*")
        .eq("author", author)
        .neq("user_id", user?.id)
        .limit(limit);

      return (books || []).map((book) => ({
        book,
        reason: `Outros livros de ${author}`,
        score: 0.9,
        type: "similar_books" as const,
      }));
    } catch (error) {
      console.error("Error fetching author recommendations:", error);
      return [];
    }
  };

  const getCollaborativeRecommendations = async (): Promise<
    Recommendation[]
  > => {
    try {
      // Find users with similar reading preferences
      const { data: similarUsers } = await supabase
        .from("books")
        .select("user_id, title, author, genre")
        .neq("user_id", user?.id)
        .limit(50);

      // Simple collaborative filtering - users who read similar books
      const recommendations: Recommendation[] = [];

      if (similarUsers) {
        const bookCounts = similarUsers.reduce(
          (acc, book) => {
            const key = `${book.title}-${book.author}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        const popularBooks = Object.entries(bookCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);

        for (const [bookKey, count] of popularBooks) {
          const [title, author] = bookKey.split("-");
          const bookData = similarUsers.find(
            (b) => b.title === title && b.author === author,
          );

          if (bookData) {
            recommendations.push({
              book: bookData as Book,
              reason: `${count} pessoas com gostos similares leram este livro`,
              score: count * 0.1,
              type: "collaborative",
            });
          }
        }
      }

      return recommendations;
    } catch (error) {
      console.error("Error fetching collaborative recommendations:", error);
      return [];
    }
  };

  const fetchTrendingBooks = async () => {
    try {
      // Get most added books in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: books } = await supabase
        .from("books")
        .select("title, author, genre, cover_url, created_at")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .limit(20);

      if (books) {
        const bookCounts = books.reduce(
          (acc, book) => {
            const key = `${book.title}-${book.author}`;
            if (!acc[key]) {
              acc[key] = { ...book, count: 0 };
            }
            acc[key].count++;
            return acc;
          },
          {} as Record<string, any>,
        );

        const trending = Object.values(bookCounts)
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 8);

        setTrendingBooks(trending as Book[]);
      }
    } catch (error) {
      console.error("Error fetching trending books:", error);
    }
  };

  const fetchFriendRecommendations = async () => {
    if (!user) return;

    try {
      // Get friends' recent books
      const { data: friendships } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", user.id)
        .eq("status", "accepted");

      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map((f) => f.friend_id);

        const { data: friendBooks } = await supabase
          .from("books")
          .select(
            `
            *,
            profiles:user_id (username, avatar_url)
          `,
          )
          .in("user_id", friendIds)
          .eq("reading_status", "completed")
          .order("created_at", { ascending: false })
          .limit(10);

        setFriendRecommendations(friendBooks || []);
      }
    } catch (error) {
      console.error("Error fetching friend recommendations:", error);
    }
  };

  const addBookToLibrary = async (
    book: Book,
    status: "want_to_read" | "reading" = "want_to_read",
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("books").insert({
        user_id: user.id,
        title: book.title,
        author: book.author,
        genre: book.genre,
        cover_url: book.cover_url,
        pages: book.pages,
        isbn: book.isbn,
        description: book.description,
        reading_status: status,
        reading_progress: 0,
      });

      if (error) throw error;

      toast({
        title: "Livro adicionado!",
        description: `"${book.title}" foi adicionado à sua estante.`,
      });
    } catch (error) {
      console.error("Error adding book:", error);
      toast({
        title: "Erro ao adicionar livro",
        description: "Não foi possível adicionar o livro.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Recomendações para Você
          </CardTitle>
          {userProfile && (
            <div className="text-sm text-muted-foreground">
              <p>Baseado em {userProfile.completed_books} livros lidos</p>
              <div className="flex gap-2 mt-1">
                {userProfile.favorite_genres.map((genre, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personalized">
                <Sparkles className="h-4 w-4 mr-2" />
                Personalizadas
              </TabsTrigger>
              <TabsTrigger value="trending">
                <TrendingUp className="h-4 w-4 mr-2" />
                Em Alta
              </TabsTrigger>
              <TabsTrigger value="friends">
                <UserCheck className="h-4 w-4 mr-2" />
                Amigos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personalized" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((rec, index) => (
                  <Card
                    key={index}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {rec.book.cover_url ? (
                          <img
                            src={rec.book.cover_url}
                            alt={rec.book.title}
                            className="w-16 h-24 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-24 bg-gray-200 rounded flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-gray-400" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                            {rec.book.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            {rec.book.author}
                          </p>

                          <div className="flex items-center gap-1 mb-2">
                            <Lightbulb className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs text-gray-600 line-clamp-2">
                              {rec.reason}
                            </span>
                          </div>

                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() =>
                                addBookToLibrary(rec.book, "want_to_read")
                              }
                              className="text-xs h-7 px-2"
                            >
                              Quero Ler
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {recommendations.length === 0 && (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    Gerando recomendações...
                  </h3>
                  <p className="text-muted-foreground">
                    Adicione alguns livros à sua estante para receber
                    recomendações personalizadas!
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="trending" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {trendingBooks.map((book, index) => (
                  <Card
                    key={index}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4 text-center">
                      {book.cover_url ? (
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="w-full h-32 object-cover rounded mb-3"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-200 rounded mb-3 flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-gray-400" />
                        </div>
                      )}

                      <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                        {book.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        {book.author}
                      </p>

                      <Button
                        size="sm"
                        onClick={() => addBookToLibrary(book)}
                        className="w-full text-xs"
                      >
                        Adicionar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="friends" className="mt-6">
              <div className="space-y-4">
                {friendRecommendations.map((book, index) => (
                  <Card
                    key={index}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={book.profiles?.avatar_url} />
                          <AvatarFallback>
                            {book.profiles?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm">
                              {book.profiles?.username}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              finalizou a leitura
                            </span>
                          </div>

                          <div className="flex gap-3">
                            {book.cover_url ? (
                              <img
                                src={book.cover_url}
                                alt={book.title}
                                className="w-12 h-16 object-cover rounded"
                              />
                            ) : (
                              <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                                <BookOpen className="h-4 w-4 text-gray-400" />
                              </div>
                            )}

                            <div className="flex-1">
                              <h4 className="font-semibold text-sm mb-1">
                                {book.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mb-2">
                                {book.author}
                              </p>

                              <Button
                                size="sm"
                                onClick={() => addBookToLibrary(book)}
                                className="text-xs h-7"
                              >
                                Quero Ler Também
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {friendRecommendations.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      Nenhuma recomendação de amigos
                    </h3>
                    <p className="text-muted-foreground">
                      Adicione amigos para ver o que eles estão lendo!
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
