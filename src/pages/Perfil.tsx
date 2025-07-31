
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, Target, Trophy, Users, Calendar, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAchievements } from "@/hooks/useAchievements";
import { FriendsSection } from "@/components/FriendsSection";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecentActivity {
  id: string;
  pages_read: number;
  previous_progress: number;
  new_progress: number;
  created_at: string;
  books: {
    title: string;
  };
}

const Perfil = () => {
  const { user, profile } = useAuth();
  const { achievements, checkAndUnlockAchievements } = useAchievements();
  const [stats, setStats] = useState({
    totalBooks: 0,
    completedBooks: 0,
    currentlyReading: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserStats = useCallback(async () => {
    if (!user) return;

    try {
      const { data: books, error } = await supabase
        .from('books')
        .select('reading_status')
        .eq('user_id', user.id);

      if (error) throw error;

      const totalBooks = books?.length || 0;
      const completedBooks = books?.filter(b => b.reading_status === 'completed').length || 0;
      const currentlyReading = books?.filter(b => b.reading_status === 'reading').length || 0;
      
      setStats({
        totalBooks,
        completedBooks,
        currentlyReading
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }, [user, profile]);

  const fetchRecentActivity = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reading_history')
        .select(`
          *,
          books (title, author)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentActivity(data || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserStats();
      fetchRecentActivity();
      checkAndUnlockAchievements();
    }
  }, [user, fetchUserStats, fetchRecentActivity, checkAndUnlockAchievements]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Carregando perfil...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <Card className="card-enchanted mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-2xl">
                {profile?.display_name?.[0] || user?.email?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {profile?.display_name || 'Leitor Anônimo'}
              </h1>
              <p className="text-muted-foreground mb-4">
                {profile?.bio || 'Apaixonado por livros e aventuras literárias'}
              </p>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{stats.completedBooks} livros lidos</span>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  <span>{achievements.length} conquistas</span>
                </div>
              </div>
            </div>
            <div className="ml-auto">
              <EditProfileDialog />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="estatisticas" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
          <TabsTrigger value="conquistas">Conquistas</TabsTrigger>
          <TabsTrigger value="amigos">Amigos</TabsTrigger>
          <TabsTrigger value="atividade">Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="estatisticas" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="card-enchanted">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Livros</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalBooks}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.currentlyReading} lendo atualmente
                </p>
              </CardContent>
            </Card>

            <Card className="card-enchanted">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Livros Concluídos</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedBooks}</div>
                <p className="text-xs text-muted-foreground">
                  Este ano
                </p>
              </CardContent>
            </Card>

            <Card className="card-enchanted">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conquistas</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{achievements.length}</div>
                <p className="text-xs text-muted-foreground">
                  Desbloqueadas
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conquistas" className="space-y-6">
          {achievements.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma conquista ainda</h3>
                <p className="text-muted-foreground">
                  Continue lendo para desbloquear suas primeiras conquistas!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement) => (
                <Card key={achievement.id} className="card-enchanted">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-2">
                      <div className="text-4xl">🏆</div>
                      <h3 className="font-semibold">{achievement.achievement_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {achievement.description}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {formatDistanceToNow(new Date(achievement.earned_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="amigos">
          <FriendsSection />
        </TabsContent>

        <TabsContent value="atividade" className="space-y-6">
          {recentActivity.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma atividade recente</h3>
                <p className="text-muted-foreground">
                  Comece a ler e atualize seu progresso para ver suas atividades aqui!
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Atividade Recente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        Leu {activity.pages_read} páginas de "{activity.books?.title}"
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Progresso: {activity.previous_progress}% → {activity.new_progress}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Perfil;
