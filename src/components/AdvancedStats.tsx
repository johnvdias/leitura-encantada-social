import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Book, Calendar, Target, TrendingUp } from "lucide-react";

interface BookStats {
  total: number;
  completed: number;
  reading: number;
  wantToRead: number;
  paused: number;
  byGenre: { [key: string]: number };
  monthlyProgress: { month: string; books: number }[];
  yearlyGoal: number;
  yearlyProgress: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#ff6b6b'];

export function AdvancedStats() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<BookStats>({
    total: 0,
    completed: 0,
    reading: 0,
    wantToRead: 0,
    paused: 0,
    byGenre: {},
    monthlyProgress: [],
    yearlyGoal: 12,
    yearlyProgress: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: books, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const currentYear = new Date().getFullYear();
      const completedThisYear = books?.filter(book => 
        book.reading_status === 'completed' && 
        new Date(book.updated_at).getFullYear() === currentYear
      ) || [];

      const genreCount: { [key: string]: number } = {};
      const monthlyData: { [key: string]: number } = {};

      books?.forEach(book => {
        if (book.genre) {
          genreCount[book.genre] = (genreCount[book.genre] || 0) + 1;
        }

        if (book.reading_status === 'completed') {
          const month = new Date(book.updated_at).toLocaleDateString('pt-BR', { month: 'short' });
          monthlyData[month] = (monthlyData[month] || 0) + 1;
        }
      });

      const monthlyProgress = Object.entries(monthlyData).map(([month, books]) => ({
        month,
        books
      }));

      setStats({
        total: books?.length || 0,
        completed: books?.filter(b => b.reading_status === 'completed').length || 0,
        reading: books?.filter(b => b.reading_status === 'reading').length || 0,
        wantToRead: books?.filter(b => b.reading_status === 'want_to_read').length || 0,
        paused: books?.filter(b => b.reading_status === 'paused').length || 0,
        byGenre: genreCount,
        monthlyProgress,
        yearlyGoal: profile?.reading_goal || 12,
        yearlyProgress: completedThisYear.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusData = [
    { name: 'Finalizados', value: stats.completed, color: '#22c55e' },
    { name: 'Lendo', value: stats.reading, color: '#3b82f6' },
    { name: 'Quero Ler', value: stats.wantToRead, color: '#f59e0b' },
    { name: 'Pausados', value: stats.paused, color: '#ef4444' },
  ].filter(item => item.value > 0);

  const genreData = Object.entries(stats.byGenre)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const goalProgress = (stats.yearlyProgress / stats.yearlyGoal) * 100;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas Avançadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Carregando estatísticas...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Livros</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalizados</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta Anual</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.yearlyProgress}/{stats.yearlyGoal}</div>
            <Progress value={goalProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status">Status dos Livros</TabsTrigger>
          <TabsTrigger value="genres">Gêneros Favoritos</TabsTrigger>
          <TabsTrigger value="progress">Progresso Mensal</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
              <CardDescription>Como seus livros estão organizados</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="genres" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gêneros Mais Lidos</CardTitle>
              <CardDescription>Seus gêneros literários favoritos</CardDescription>
            </CardHeader>
            <CardContent>
              {genreData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={genreData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="genre" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  Adicione gêneros aos seus livros para ver estatísticas
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progresso Mensal</CardTitle>
              <CardDescription>Livros finalizados por mês</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.monthlyProgress.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.monthlyProgress}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="books" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  Finalize alguns livros para ver seu progresso
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}