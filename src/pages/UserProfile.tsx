import { useState, useEffect, useCallback } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Target, Trophy, Calendar, UserPlus, UserCheck, UserX, AlertCircle, MessageCircle, BookmarkPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NudgeButton } from "@/components/NudgeButton";
import { useFriendships } from "@/hooks/useFriendships";

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
  genre: string | null;
  reading_status: string;
  rating: number;
  completed_at: string | null;
  created_at: string;
}
interface Achievement {
    id: string;
    achievement_name: string;
    description: string;
    earned_at: string;
    emoji: string | null;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendFriendRequest, removeFriendship, cancelFriendRequest, acceptFriendRequest, friends, friendRequests, sentRequests } = useFriendships();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [ownBookKeys, setOwnBookKeys] = useState<Set<string>>(new Set());
  const [addingBookId, setAddingBookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = user?.id === userId;
  const bookKey = (title: string, author: string) => `${title.trim().toLowerCase()}|${author.trim().toLowerCase()}`;

  const fetchUserData = useCallback(async () => {
    if (!userId || isOwnProfile) return;

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
        .select('id, title, author, cover_url, genre, reading_status, rating, completed_at, created_at')
        .eq('user_id', userId);

      if (booksError) throw new Error("Não foi possível carregar os livros.");

      if (user?.id) {
        const { data: myBooksData } = await supabase
          .from('books')
          .select('title, author')
          .eq('user_id', user.id);
        setOwnBookKeys(new Set((myBooksData || []).map(b => bookKey(b.title, b.author))));
      }

      setStats({
        totalBooks: booksData.length,
        completedBooks: booksData.filter(b => b.reading_status === 'completed').length,
        currentlyReading: booksData.filter(b => b.reading_status === 'reading').length,
      });

      // Mais recentes primeiro: usa a data de conclusão (a que a própria
      // dona da estante escolheu ao marcar como lido) quando existe, senão
      // cai pra data em que o livro foi adicionado à estante. Antes isso
      // ordenava por `id`, que não tem relação nenhuma com a ordem de
      // leitura.
      const effectiveDate = (b: Book) => b.completed_at ?? b.created_at;
      setBooks(
        (booksData as Book[]).sort((a, b) => effectiveDate(b).localeCompare(effectiveDate(a)))
      );

      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('id, achievement_name, description, earned_at, emoji')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (achievementsError) console.error("Erro ao buscar conquistas:", achievementsError);
      else setAchievements(achievementsData as Achievement[]);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar o perfil.";
      setError(message);
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, toast, isOwnProfile, user?.id]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleAddToWantToRead = async (book: Book) => {
    if (!user) return;
    setAddingBookId(book.id);
    try {
      const { error } = await supabase.from('books').insert({
        user_id: user.id,
        title: book.title,
        author: book.author,
        cover_url: book.cover_url || null,
        genre: book.genre || null,
        reading_status: 'want_to_read',
      });
      if (error) throw error;
      setOwnBookKeys(prev => new Set(prev).add(bookKey(book.title, book.author)));
      toast({ title: "Adicionado! 📚", description: `"${book.title}" foi pra sua lista de Quero Ler.` });
    } catch (err) {
      toast({ title: "Erro", description: "Não foi possível adicionar o livro.", variant: "destructive" });
    } finally {
      setAddingBookId(null);
    }
  };

  if (isOwnProfile) {
    return <Navigate to="/perfil" replace />;
  }

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

  const readingBooks = books.filter(b => b.reading_status === 'reading');
  const completedBooks = books.filter(b => b.reading_status === 'completed');

  const renderBookCard = (book: Book) => {
    const alreadyOwned = ownBookKeys.has(bookKey(book.title, book.author));
    return (
      <Card key={book.id}>
        <CardContent className="p-4 flex flex-col items-center text-center">
          <img src={book.cover_url || '/placeholder.svg'} alt={book.title} className="h-48 w-32 object-cover rounded-md mb-4" />
          <h3 className="font-semibold text-lg">{book.title}</h3>
          <p className="text-sm text-muted-foreground">{book.author}</p>
          {book.rating && <p>Nota: {book.rating}/5</p>}
          <Button
            variant={alreadyOwned ? "ghost" : "outline"}
            size="sm"
            disabled={alreadyOwned || addingBookId === book.id}
            onClick={() => handleAddToWantToRead(book)}
            className="mt-3 w-full"
          >
            {addingBookId === book.id ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <BookmarkPlus className="h-4 w-4 mr-2" />
            )}
            {alreadyOwned ? "Já está na sua estante" : "Quero Ler"}
          </Button>
        </CardContent>
      </Card>
    );
  };

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
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                  <Calendar className="h-4 w-4" />
                  <span>Membro desde {format(new Date(profile.created_at), "MMM yyyy", { locale: ptBR })}</span>
                </div>
                {achievements.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Trophy className="h-4 w-4" />
                      <span>{achievements.length} conquista{achievements.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {achievements.map((ach) => (
                        <Badge key={ach.id} variant="secondary" className="flex items-center gap-1 px-2 py-1" title={ach.description}>
                          <span className="text-sm">{ach.emoji || '🏆'}</span>
                          <span className="text-xs">{ach.achievement_name}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-2 self-start sm:self-end">
              {!isOwnProfile && friends.some(f => f.friend.user_id === userId) && (
                <>
                  <Link to={`/mensagens/${userId}`}>
                    <Button variant="outline"><MessageCircle className="h-4 w-4 mr-2" />Mensagem</Button>
                  </Link>
                  <NudgeButton friendId={userId!} friendName={profile.display_name} />
                </>
              )}
              {renderFriendshipButton()}
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="lendo">
        <TabsList className="flex w-full items-center justify-start overflow-x-auto sm:grid sm:grid-cols-3 gap-1">
          <TabsTrigger value="lendo" className="shrink-0">Lendo ({readingBooks.length})</TabsTrigger>
          <TabsTrigger value="lido" className="shrink-0">Lido ({completedBooks.length})</TabsTrigger>
          <TabsTrigger value="stats" className="shrink-0">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="lendo" className="mt-6">
            {readingBooks.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {readingBooks.map(book => renderBookCard(book))}
                </div>
            ) : <p>Nenhum livro sendo lido no momento.</p>}
        </TabsContent>

        <TabsContent value="lido" className="mt-6">
            {completedBooks.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {completedBooks.map(book => renderBookCard(book))}
                </div>
            ) : <p>Nenhum livro concluído ainda.</p>}
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
