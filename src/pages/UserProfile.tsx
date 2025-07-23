import { useState, useEffect, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, BookOpen, Target, Award, Calendar, UserPlus, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserProfile {
  user_id: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  reading_goal: number;
  created_at: string;
}

interface UserStats {
  totalBooks: number;
  completedBooks: number;
  currentlyReading: number;
  currentProgress: number;
}

interface Achievement {
  id: string;
  achievement_name: string;
  achievement_type: string;
  description: string;
  earned_at: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  reading_status: string;
  rating: number;
  reading_progress: number;
}

interface FriendshipStatus {
  status: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  friendshipId?: string;
}

const UserProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    totalBooks: 0,
    completedBooks: 0,
    currentlyReading: 0,
    currentProgress: 0
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>({ status: 'none' });
  const [loading, setLoading] = useState(true);
  const [friendshipLoading, setFriendshipLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const isOwnProfile = user?.id === userId;

  const checkFriendshipStatus = useCallback(async () => {
    if (!user || !userId) return;

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFriendshipStatus({
          status: data.requester_id === user.id 
            ? (data.status === 'accepted' ? 'accepted' : 'pending_sent')
            : (data.status === 'accepted' ? 'accepted' : 'pending_received'),
          friendshipId: data.id
        });
      }
    } catch (error) {
      console.error('Error checking friendship status:', error);
    }
  }, [user, userId]);

  const fetchUserData = useCallback(async () => {
    if (!userId) return;

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch user stats
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('reading_status, reading_progress')
        .eq('user_id', userId);

      if (booksError) throw booksError;

      const totalBooks = booksData.length;
      const completedBooks = booksData.filter(book => book.reading_status === 'completed').length;
      const currentlyReading = booksData.filter(book => book.reading_status === 'reading').length;
      const totalProgress = booksData.reduce((sum, book) => sum + book.reading_progress, 0);
      const currentProgress = totalBooks > 0 ? Math.round(totalProgress / totalBooks) : 0;

      setStats({
        totalBooks,
        completedBooks,
        currentlyReading,
        currentProgress
      });

      // Fetch achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .limit(6);

      if (achievementsError) throw achievementsError;
      setAchievements(achievementsData || []);

      // Fetch recent books
      const { data: recentBooksData, error: recentBooksError } = await supabase
        .from('books')
        .select('id, title, author, cover_url, reading_status, rating, reading_progress')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(6);

      if (recentBooksError) throw recentBooksError;
      setRecentBooks(recentBooksData || []);

      // Check friendship status if not own profile
      if (!isOwnProfile) {
        await checkFriendshipStatus();
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o perfil do usuário",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [userId, isOwnProfile, toast, checkFriendshipStatus]);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId, fetchUserData]);

  const sendFriendRequest = async () => {
    if (!user || !userId) return;

    setFriendshipLoading(true);
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: userId,
          status: 'pending'
        });

      if (error) throw error;

      setFriendshipStatus({ status: 'pending_sent' });
      toast({
        title: "Solicitação enviada! 🤝",
        description: "Sua solicitação de amizade foi enviada"
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a solicitação",
        variant: "destructive"
      });
    } finally {
      setFriendshipLoading(false);
    }
  };

  const acceptFriendRequest = async () => {
    if (!friendshipStatus.friendshipId) return;

    setFriendshipLoading(true);
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipStatus.friendshipId);

      if (error) throw error;

      setFriendshipStatus({ ...friendshipStatus, status: 'accepted' });
      toast({
        title: "Amizade aceita! 🎉",
        description: "Vocês agora são amigos"
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: "Erro",
        description: "Não foi possível aceitar a solicitação",
        variant: "destructive"
      });
    } finally {
      setFriendshipLoading(false);
    }
  };

  const removeFriend = async () => {
    if (!friendshipStatus.friendshipId) return;

    setFriendshipLoading(true);
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipStatus.friendshipId);

      if (error) throw error;

      setFriendshipStatus({ status: 'none' });
      toast({
        title: "Amizade removida",
        description: "A amizade foi removida"
      });
    } catch (error) {
      console.error('Error removing friend:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a amizade",
        variant: "destructive"
      });
    } finally {
      setFriendshipLoading(false);
    }
  };

  if (!userId) {
    return <Navigate to="/perfil" replace />;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Carregando perfil...</div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/perfil" replace />;
  }

  const renderFriendshipButton = () => {
    if (isOwnProfile) return null;

    switch (friendshipStatus.status) {
      case 'none':
        return (
          <Button onClick={sendFriendRequest} disabled={friendshipLoading}>
            <UserPlus className="h-4 w-4 mr-1" />
            {friendshipLoading ? "Enviando..." : "Adicionar Amigo"}
          </Button>
        );
      case 'pending_sent':
        return (
          <Button variant="outline" disabled>
            <UserPlus className="h-4 w-4 mr-1" />
            Solicitação Enviada
          </Button>
        );
      case 'pending_received':
        return (
          <Button onClick={acceptFriendRequest} disabled={friendshipLoading}>
            <UserCheck className="h-4 w-4 mr-1" />
            {friendshipLoading ? "Aceitando..." : "Aceitar Solicitação"}
          </Button>
        );
      case 'accepted':
        return (
          <Button variant="outline" onClick={removeFriend} disabled={friendshipLoading}>
            <UserX className="h-4 w-4 mr-1" />
            {friendshipLoading ? "Removendo..." : "Remover Amigo"}
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <Card className="card-enchanted mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {profile.display_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h1 className="text-3xl font-bold text-primary mb-2">
                  {profile.display_name || 'Usuário'}
                </h1>
                {profile.bio && (
                  <p className="text-muted-foreground mb-3">{profile.bio}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Membro desde {formatDistanceToNow(new Date(profile.created_at), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </div>
                  {friendshipStatus.status === 'accepted' && (
                    <Badge className="bg-green-500/20 text-green-700 dark:text-green-300">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Amigo
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {renderFriendshipButton()}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalBooks}</div>
              <div className="text-sm text-muted-foreground">Total de Livros</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completedBooks}</div>
              <div className="text-sm text-muted-foreground">Finalizados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.currentlyReading}</div>
              <div className="text-sm text-muted-foreground">Lendo Agora</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{profile.reading_goal || 12}</div>
              <div className="text-sm text-muted-foreground">Meta Anual</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Content */}
      <Tabs defaultValue="books" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="books">Livros</TabsTrigger>
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
        </TabsList>

        <TabsContent value="books">
          <Card className="card-enchanted">
            <CardHeader>
              <CardTitle>Livros Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentBooks.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Nenhum livro encontrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentBooks.map((book) => (
                    <div key={book.id} className="flex items-center gap-3 p-3 rounded border">
                      <img
                        src={book.cover_url || '/placeholder.svg'}
                        alt={book.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{book.title}</h4>
                        <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {book.reading_status === 'completed' && 'Finalizado'}
                            {book.reading_status === 'reading' && 'Lendo'}
                            {book.reading_status === 'want_to_read' && 'Quero Ler'}
                          </Badge>
                          {book.reading_progress > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {book.reading_progress}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          <Card className="card-enchanted">
            <CardHeader>
              <CardTitle>Conquistas</CardTitle>
            </CardHeader>
            <CardContent>
              {achievements.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Nenhuma conquista ainda</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement) => (
                    <div key={achievement.id} className="p-4 rounded border bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
                      <div className="flex items-center gap-3">
                        <Award className="h-8 w-8 text-yellow-600" />
                        <div>
                          <h4 className="font-semibold">{achievement.achievement_name}</h4>
                          {achievement.description && (
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(achievement.earned_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserProfile;