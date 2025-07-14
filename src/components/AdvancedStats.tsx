import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  BookOpen,
  Users,
  Target,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface MonthlyStats {
  month: string;
  books_completed: number;
  pages_read: number;
  reading_time: number;
}

interface GenreStats {
  genre: string;
  count: number;
  percentage: number;
}

interface ReadingStreak {
  current_streak: number;
  longest_streak: number;
  last_read_date: string;
}

interface ComparisonStats {
  user_books: number;
  user_pages: number;
  avg_books: number;
  avg_pages: number;
  user_rank: number;
  total_users: number;
}

export function AdvancedStats() {
  const { user } = useAuth();
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [genreStats, setGenreStats] = useState<GenreStats[]>([]);
  const [readingStreak, setReadingStreak] = useState<ReadingStreak | null>(
    null,
  );
  const [comparisonStats, setComparisonStats] =
    useState<ComparisonStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAdvancedStats();
    }
  }, [user]);

  const fetchAdvancedStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await Promise.all([
        fetchMonthlyStats(),
        fetchGenreStats(),
        fetchReadingStreak(),
        fetchComparisonStats(),
      ]);
    } catch (error) {
      console.error("Error fetching advanced stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyStats = async () => {
    if (!user) return;

    try {
      // Buscar livros completados nos últimos 12 meses
      const { data: books, error } = await supabase
        .from("books")
        .select("created_at, pages, reading_status")
        .eq("user_id", user.id)
        .eq("reading_status", "completed")
        .gte(
          "created_at",
          new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        );

      if (error) throw error;

      // Agrupar por mês
      const monthlyData: Record<string, MonthlyStats> = {};

      // Inicializar últimos 12 meses
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString("pt-BR", {
          month: "short",
          year: "numeric",
        });
        monthlyData[monthKey] = {
          month: monthKey,
          books_completed: 0,
          pages_read: 0,
          reading_time: 0, // Placeholder - seria calculado com dados reais
        };
      }

      // Preencher com dados reais
      books?.forEach((book) => {
        const date = new Date(book.created_at);
        const monthKey = date.toLocaleDateString("pt-BR", {
          month: "short",
          year: "numeric",
        });

        if (monthlyData[monthKey]) {
          monthlyData[monthKey].books_completed++;
          monthlyData[monthKey].pages_read += book.pages || 0;
          monthlyData[monthKey].reading_time += Math.round(
            (book.pages || 0) * 2,
          ); // Estimativa: 2 min/página
        }
      });

      setMonthlyStats(Object.values(monthlyData));
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
    }
  };

  const fetchGenreStats = async () => {
    if (!user) return;

    try {
      const { data: books, error } = await supabase
        .from("books")
        .select("genre")
        .eq("user_id", user.id)
        .eq("reading_status", "completed");

      if (error) throw error;

      // Contar por gênero
      const genreCounts: Record<string, number> = {};
      books?.forEach((book) => {
        const genre = book.genre || "Outros";
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });

      const total = Object.values(genreCounts).reduce(
        (sum, count) => sum + count,
        0,
      );

      const genreData = Object.entries(genreCounts)
        .map(([genre, count]) => ({
          genre,
          count,
          percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6); // Top 6 gêneros

      setGenreStats(genreData);
    } catch (error) {
      console.error("Error fetching genre stats:", error);
    }
  };

  const fetchReadingStreak = async () => {
    if (!user) return;

    try {
      // Buscar histórico de leitura para calcular streak
      const { data: history, error } = await supabase
        .from("reading_history")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calcular streak (simplificado)
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let lastDate: Date | null = null;

      history?.forEach((entry) => {
        const entryDate = new Date(entry.created_at);
        const daysDiff = lastDate
          ? Math.floor(
              (lastDate.getTime() - entryDate.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 0;

        if (!lastDate || daysDiff <= 1) {
          tempStreak++;
          if (!lastDate) currentStreak = tempStreak;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }

        lastDate = entryDate;
      });

      longestStreak = Math.max(longestStreak, tempStreak);

      setReadingStreak({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_read_date: history?.[0]?.created_at || "",
      });
    } catch (error) {
      console.error("Error fetching reading streak:", error);
    }
  };

  const fetchComparisonStats = async () => {
    if (!user) return;

    try {
      // Buscar stats do usuário
      const { data: userBooks, error: userError } = await supabase
        .from("books")
        .select("pages")
        .eq("user_id", user.id)
        .eq("reading_status", "completed");

      if (userError) throw userError;

      const userBooksCount = userBooks?.length || 0;
      const userPagesCount =
        userBooks?.reduce((sum, book) => sum + (book.pages || 0), 0) || 0;

      // Buscar médias gerais (simplificado)
      const { data: allStats, error: statsError } = await supabase
        .from("books")
        .select("user_id, pages")
        .eq("reading_status", "completed");

      if (statsError) throw statsError;

      // Calcular médias
      const userCounts: Record<string, { books: number; pages: number }> = {};
      allStats?.forEach((book) => {
        if (!userCounts[book.user_id]) {
          userCounts[book.user_id] = { books: 0, pages: 0 };
        }
        userCounts[book.user_id].books++;
        userCounts[book.user_id].pages += book.pages || 0;
      });

      const totalUsers = Object.keys(userCounts).length;
      const avgBooks =
        Object.values(userCounts).reduce((sum, user) => sum + user.books, 0) /
        totalUsers;
      const avgPages =
        Object.values(userCounts).reduce((sum, user) => sum + user.pages, 0) /
        totalUsers;

      // Calcular ranking do usuário
      const sortedUsers = Object.values(userCounts).sort(
        (a, b) => b.books - a.books,
      );
      const userRank =
        sortedUsers.findIndex((u) => u.books <= userBooksCount) + 1;

      setComparisonStats({
        user_books: userBooksCount,
        user_pages: userPagesCount,
        avg_books: Math.round(avgBooks),
        avg_pages: Math.round(avgPages),
        user_rank: userRank || totalUsers,
        total_users: totalUsers,
      });
    } catch (error) {
      console.error("Error fetching comparison stats:", error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">Carregando estatísticas...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="monthly">Mensal</TabsTrigger>
          <TabsTrigger value="genres">Gêneros</TabsTrigger>
          <TabsTrigger value="streaks">Streaks</TabsTrigger>
          <TabsTrigger value="comparison">Comparação</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Progresso Mensal (Últimos 12 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyStats.map((month) => (
                  <div key={month.month} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{month.month}</span>
                      <span>
                        {month.books_completed} livros • {month.pages_read}{" "}
                        páginas
                      </span>
                    </div>
                    <Progress
                      value={Math.min((month.books_completed / 5) * 100, 100)}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="genres" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Distribuição por Gêneros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {genreStats.map((genre) => (
                  <div key={genre.genre} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{genre.genre}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{genre.count} livros</Badge>
                        <span className="text-sm text-muted-foreground">
                          {genre.percentage}%
                        </span>
                      </div>
                    </div>
                    <Progress value={genre.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streaks" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Streak Atual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {readingStreak?.current_streak || 0}
                  </div>
                  <p className="text-muted-foreground">dias consecutivos</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Melhor Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-secondary">
                    {readingStreak?.longest_streak || 0}
                  </div>
                  <p className="text-muted-foreground">dias consecutivos</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          {comparisonStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Seu Ranking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold">
                      #{comparisonStats.user_rank} de{" "}
                      {comparisonStats.total_users}
                    </div>
                    <p className="text-muted-foreground">
                      posição na comunidade
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Comparação com Média</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Seus livros:</span>
                      <span className="font-bold">
                        {comparisonStats.user_books}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Média da comunidade:</span>
                      <span>{comparisonStats.avg_books}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Suas páginas:</span>
                      <span className="font-bold">
                        {comparisonStats.user_pages.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Média da comunidade:</span>
                      <span>{comparisonStats.avg_pages.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
