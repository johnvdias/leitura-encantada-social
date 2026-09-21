import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, Users, UserPlus, Star, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

interface BookRecommendation {
  id: string;
  title: string;
  author: string;
  genre: string;
  cover_url: string;
  rating: number;
  userCount: number;
}

interface UserRecommendation {
  user_id: string;
  display_name: string;
  avatar_url: string;
  commonBooks: number;
  commonGenres: string[];
}

interface ClubRecommendation {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  current_book: {
    title: string;
    author: string;
  };
}

export function RecommendationSystem() {
  const [bookRecs, setBookRecs] = useState<BookRecommendation[]>([]);
  const [userRecs, setUserRecs] = useState<UserRecommendation[]>([]);
  const [clubRecs, setClubRecs] = useState<ClubRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchRecommendations = useCallback(async () => {
    if (!user) return;

    try {
      // Get user's reading history and preferences
      const { data: userBooks } = await supabase
        .from('books')
        .select('genre, rating')
        .eq('user_id', user.id)
        .not('genre', 'is', null);

      const userGenres = [...new Set(userBooks?.map(b => b.genre).filter(Boolean))];
      
      // Book recommendations based on genre and popularity
      const { data: popularBooks } = await supabase
        .from('books')
        .select('title, author, genre, cover_url, rating')
        .in('genre', userGenres.length > 0 ? userGenres : ['Ficção', 'Romance', 'Fantasia'])
        .not('user_id', 'eq', user.id)
        .not('rating', 'is', null)
        .gte('rating', 4)
        .order('rating', { ascending: false })
        .limit(3);

      // Process book recommendations
      const bookRecommendations: BookRecommendation[] = [];
      const seenBooks = new Set();

      for (const book of popularBooks || []) {
        const bookKey = `${book.title}-${book.author}`;
        if (!seenBooks.has(bookKey)) {
          seenBooks.add(bookKey);
          
          // Count how many users have this book
          const { count } = await supabase
            .from('books')
            .select('*', { count: 'exact', head: true })
            .eq('title', book.title)
            .eq('author', book.author);

          bookRecommendations.push({
            id: `${book.title}-${book.author}`,
            title: book.title,
            author: book.author,
            genre: book.genre,
            cover_url: book.cover_url,
            rating: book.rating,
            userCount: count || 0
          });
        }
      }

      setBookRecs(bookRecommendations);

      // User recommendations based on similar reading preferences
      const { data: similarUsers } = await supabase
        .from('books')
        .select('user_id, genre')
        .in('genre', userGenres)
        .not('user_id', 'eq', user.id);

      const userGenreMap = new Map();
      similarUsers?.forEach(book => {
        if (!userGenreMap.has(book.user_id)) {
          userGenreMap.set(book.user_id, new Set());
        }
        userGenreMap.get(book.user_id).add(book.genre);
      });

      const userRecommendations: UserRecommendation[] = [];
      for (const [userId, genres] of userGenreMap.entries()) {
        const commonGenres = userGenres.filter(g => genres.has(g));
        if (commonGenres.length >= 2) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, user_id')
            .eq('user_id', userId)
            .maybeSingle();

          if (profile) {
            userRecommendations.push({
              user_id: userId,
              display_name: profile.display_name || 'Usuário',
              avatar_url: profile.avatar_url || '',
              commonBooks: 0,
              commonGenres
            });
          }
        }
      }

      setUserRecs(userRecommendations.slice(0, 3));

      // Club recommendations based on genres and popularity
      const { data: clubs } = await supabase
        .from('clubs')
        .select(`
          id, name, description, is_private,
          books (title, author),
          club_members (id)
        `)
        .eq('is_private', false)
        .limit(3);

      const clubRecommendations = clubs?.map(club => ({
        id: club.id,
        name: club.name,
        description: club.description || '',
        memberCount: club.club_members?.length || 0,
        current_book: club.books ? {
          title: club.books.title,
          author: club.books.author
        } : { title: '', author: '' }
      })) || [];

      setClubRecs(clubRecommendations);

    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user, fetchRecommendations]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center text-muted-foreground">
          Carregando recomendações personalizadas...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Book Recommendations */}
      {bookRecs.length > 0 && (
        <Card className="card-enchanted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Livros Recomendados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {bookRecs.map((book) => (
                <div key={book.id} className="flex gap-3 p-3 border rounded hover:bg-muted/50 transition-colors">
                  <div className="w-12 h-16 bg-muted rounded flex-shrink-0 overflow-hidden">
                    {book.cover_url && (
                      <img 
                        src={book.cover_url} 
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2">{book.title}</h4>
                    <p className="text-xs text-muted-foreground">{book.author}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs">{book.rating}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {book.userCount} leitores
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs mt-1">
                      {book.genre}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Recommendations */}
      {userRecs.length > 0 && (
        <Card className="card-enchanted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Leitores para Seguir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userRecs.map((user) => (
                <div key={user.user_id} className="flex items-center justify-between">
                  <Link to={`/perfil/${user.user_id}`} className="flex items-center gap-3 hover:bg-muted/50 p-2 rounded transition-colors flex-1 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>
                        {user.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.display_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        Gêneros em comum: {user.commonGenres.join(', ')}
                      </p>
                    </div>
                  </Link>
                  <Button variant="outline" size="sm" className="shrink-0">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Club Recommendations */}
      {clubRecs.length > 0 && (
        <Card className="card-enchanted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Clubes Recomendados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clubRecs.map((club) => (
                <div key={club.id} className="flex items-center justify-between p-3 border rounded">
                  <Link to={`/clubes/${club.id}`} className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{club.name}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {club.description}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {club.memberCount} membros
                      </span>
                      {club.current_book.title && (
                        <span className="text-xs text-muted-foreground">
                          Lendo: {club.current_book.title}
                        </span>
                      )}
                    </div>
                  </Link>
                  <Button variant="outline" size="sm" asChild className="shrink-0">
                    <Link to={`/clubes/${club.id}`}>
                      Ver Clube
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {bookRecs.length === 0 && userRecs.length === 0 && clubRecs.length === 0 && (
        <Card className="card-enchanted">
          <CardContent className="text-center py-12">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma recomendação ainda</h3>
            <p className="text-muted-foreground">
              Adicione alguns livros à sua estante para receber recomendações personalizadas!
            </p>
            <Button asChild className="mt-4">
              <Link to="/estante">
                Adicionar Livros
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
