import { useState, useEffect, useCallback } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Target, Award, Calendar, UserPlus, UserCheck, UserX, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NudgeButton } from "@/components/NudgeButton";
import { useFriendships } from "@/hooks/useFriendships";
import { RequestLoanButton } from "@/components/RequestLoanButton";

// Interfaces para os dados
interface Profile {
  user_id: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  created_at: string;
}
interface Stats {
  totalBooks: number;
  completedBooks: number;
  currentlyReading: number;
}
interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  reading_status: string;
  rating: number;
}
interface Achievement {
    id: string;
    achievement_name: string;
    description: string;
    earned_at: string;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendFriendRequest, removeFriendship, cancelFriendRequest, acceptFriendRequest, friends, friendRequests, sentRequests } = useFriendships();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = user?.id === userId;

  const fetchUserData = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, bio, avatar_url, created_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError || !profileData) throw new Error("Perfil não encontrado.");
      setProfile(profileData as Profile);

      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('id, title, author, cover_url, reading_status, rating')
        .eq('user_id', userId);

      if (booksError) throw new Error("Não foi possível carregar os livros.");

      setStats({
        totalBooks: booksData.length,
        completedBooks: booksData.filter(b => b.reading_status === 'completed').length,
        currentlyReading: booksData.filter(b => b.reading_status === 'reading').length,
      });

      setRecentBooks(booksData.sort((a,b) => b.id > a.id ? 1 : -1).slice(0, 6) as Book[]);

      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('id, achievement_name, description, earned_at')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .limit(6);
      
      if (achievementsError) console.error("Erro ao buscar conquistas:", achievementsError);
      else setAchievements(achievementsData as Achievement[]);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar o perfil.";
      setError(message);
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const renderFriendshipButton = () => {
    if (isOwnProfile) return null;

    const friendship = [...friends, ...friendRequests, ...sentRequests].find(f => 
        (f.requester_id === userId || f.addressee_id === userId)
    );

    if (friendship) {
        if (friendship.status === 'accepted') {
            return <Button variant="outline" onClick={() => removeFriendship(friendship.id)}><UserX className="h-4 w-4 mr-2" />Remover Amizade</Button>;
        }
        if (friendship.status === 'pending') {
            if (friendship.addressee_id === user?.id) {
                return <Button onClick={() => acceptFriendRequest(friendship.id, friendship.requester_id)}><UserCheck className="h-4 w-4 mr-2" />Aceitar Pedido</Button>;
            }
            return <Button variant="outline" disabled>Pedido Enviado</Button>;
        }
    }
    
    return <Button onClick={() => sendFriendRequest(userId!)}><UserPlus className="h-4 w-4 mr-2" />Adicionar Amigo</Button>;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
            <CardHeader>
                <div className="flex items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                </div>
            </CardHeader>
        </Card>
        <Skeleton className="h-10 w-1/3" />
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center text-center py-20">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Erro ao Carregar Perfil</h2>
        <p className="text-muted-foreground mb-6">{error || "Não foi possível encontrar o usuário solicitado."}</p>
        <Button asChild><Link to="/feed">Voltar para o Feed</Link></Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-8 card-enchanted">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 border-2 border-primary/20">
                <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
                <AvatarFallback className="text-2xl">{profile.display_name?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-primary mb-2">{profile.display_name}</h1>
                {profile.bio && <p className="text-muted-foreground mb-3">{profile.bio}</p>}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Membro desde {format(new Date(profile.created_at), "MMM yyyy", { locale: ptBR })}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-end">
              {!isOwnProfile && friends.some(f => f.friend.user_id === userId) && (
                <NudgeButton friendId={userId!} friendName={profile.display_name} />
              )}
              {renderFriendshipButton()}
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">Estante ({stats?.totalBooks || 0})</TabsTrigger>
          <TabsTrigger value="achievements">Conquistas ({achievements.length})</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="mt-6">
            {recentBooks.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {recentBooks.map(book => (
                        <Card key={book.id}>
                            <CardContent className="p-4 flex flex-col items-center text-center">
                                <img src={book.cover_url || '/placeholder.svg'} alt={book.title} className="h-48 w-32 object-cover rounded-md mb-4" />
                                <h3 className="font-semibold text-lg">{book.title}</h3>
                                <p className="text-sm text-muted-foreground">{book.author}</p>
                                {book.rating && <p>Nota: {book.rating}/5</p>}
                                {!isOwnProfile && <RequestLoanButton bookId={book.id} />}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : <p>A estante deste usuário está vazia.</p>}
        </TabsContent>

        <TabsContent value="achievements" className="mt-6">
            {achievements.length > 0 ? (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {achievements.map(ach => (
                        <Card key={ach.id} className="p-4 flex items-center gap-4">
                            <Award className="h-8 w-8 text-yellow-500" />
                            <div>
                                <h3 className="font-semibold">{ach.achievement_name}</h3>
                                <p className="text-sm text-muted-foreground">{ach.description}</p>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : <p>Nenhuma conquista desbloqueada ainda.</p>}
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader><CardTitle>Livros na Estante</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold">{stats?.totalBooks || 0}</p></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Livros Concluídos</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold">{stats?.completedBooks || 0}</p></CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Lendo Atualmente</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold">{stats?.currentlyReading || 0}</p></CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserProfile;
