import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarDays, User, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CompletedBookRow {
  title: string;
  author: string | null;
  cover_url: string | null;
  rating: number | null;
  completed_at: string | null;
  updated_at: string;
}

interface MonthRanking {
  key: string;
  label: string;
  count: number;
}

interface AuthorRanking {
  author: string;
  count: number;
}

interface FavoriteBook {
  title: string;
  author: string | null;
  coverUrl: string | null;
  rating: number;
  periodLabel: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const effectiveDate = (b: CompletedBookRow) => b.completed_at ?? b.updated_at.slice(0, 10);

const monthLabel = (yyyymm: string) => {
  const [y, m] = yyyymm.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} de ${y}`;
};

function RankRow({ position, children }: { position: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {position}
      </span>
      {children}
    </div>
  );
}

export function PersonalRankings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthRanking, setMonthRanking] = useState<MonthRanking[]>([]);
  const [authorRanking, setAuthorRanking] = useState<AuthorRanking[]>([]);
  const [favoriteBooks, setFavoriteBooks] = useState<FavoriteBook[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchRankings = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('books')
          .select('title, author, cover_url, rating, completed_at, updated_at')
          .eq('user_id', user.id)
          .eq('reading_status', 'completed');

        const books = (data || []) as CompletedBookRow[];
        if (cancelled) return;

        const monthCounts = new Map<string, number>();
        const authorCounts = new Map<string, number>();
        books.forEach((b) => {
          const key = effectiveDate(b).slice(0, 7);
          monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
          if (b.author) authorCounts.set(b.author, (authorCounts.get(b.author) || 0) + 1);
        });

        const months = [...monthCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([key, count]) => ({ key, label: monthLabel(key), count }));

        const authors = [...authorCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([author, count]) => ({ author, count }));

        const favorites = books
          .filter((b) => (b.rating || 0) > 0)
          .sort((a, b) => {
            if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
            return effectiveDate(b).localeCompare(effectiveDate(a));
          })
          .slice(0, 5)
          .map((b) => ({
            title: b.title,
            author: b.author,
            coverUrl: b.cover_url,
            rating: b.rating || 0,
            periodLabel: monthLabel(effectiveDate(b).slice(0, 7)),
          }));

        setMonthRanking(months);
        setAuthorRanking(authors);
        setFavoriteBooks(favorites);
      } catch (error) {
        console.error('Error fetching personal rankings:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRankings();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isEmpty = monthRanking.length === 0 && authorRanking.length === 0 && favoriteBooks.length === 0;

  if (isEmpty) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Star className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">Nenhum ranking ainda</h3>
          <p className="text-muted-foreground">
            Marque livros como lidos e avalie-os para ver seus rankings pessoais aqui!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="card-enchanted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" />
            Meses em que mais leu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {monthRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há dados suficientes.</p>
          ) : (
            monthRanking.map((m, i) => (
              <RankRow key={m.key} position={i + 1}>
                <div className="flex-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium capitalize">{m.label}</span>
                  <span className="text-sm text-muted-foreground shrink-0">
                    {m.count} livro{m.count === 1 ? '' : 's'}
                  </span>
                </div>
              </RankRow>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="card-enchanted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-primary" />
            Autoras/autores mais lidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {authorRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há dados suficientes.</p>
          ) : (
            authorRanking.map((a, i) => (
              <RankRow key={a.author} position={i + 1}>
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{a.author}</span>
                  <span className="text-sm text-muted-foreground shrink-0">
                    {a.count} livro{a.count === 1 ? '' : 's'}
                  </span>
                </div>
              </RankRow>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="card-enchanted md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-5 w-5 text-primary" />
            Livros favoritos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {favoriteBooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Avalie os livros que terminou pra ver seus favoritos aqui.</p>
          ) : (
            favoriteBooks.map((b, i) => (
              <RankRow key={`${b.title}-${i}`} position={i + 1}>
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  {b.coverUrl ? (
                    <img src={b.coverUrl} alt={b.title} className="w-9 h-12 object-cover rounded shrink-0" />
                  ) : (
                    <div className="w-9 h-12 rounded bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.author || 'Autor desconhecido'} · {b.periodLabel}
                    </p>
                  </div>
                  <span className="text-xs text-yellow-500 shrink-0">{'⭐'.repeat(b.rating)}</span>
                </div>
              </RankRow>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
