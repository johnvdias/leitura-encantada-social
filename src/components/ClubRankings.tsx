import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trophy, User, Star, BookMarked, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PeriodMode = 'all' | 'year' | 'month';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const dateKey = (d: Date) => d.toISOString().slice(0, 10);

interface TopReader {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  completed_count: number;
  total_pages: number;
}

interface TopAuthor {
  author: string;
  count: number;
}

interface TopGenre {
  genre: string;
  count: number;
}

interface TopBook {
  title: string;
  author: string | null;
  cover_url: string | null;
  lovers_count: number;
  avg_rating: number;
}

interface ClubRankingsData {
  top_readers: TopReader[];
  top_authors: TopAuthor[];
  top_genres: TopGenre[];
  top_books: TopBook[];
  total_books: number;
  total_pages: number;
  member_count: number;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function RankRow({ position, children }: { position: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {RANK_MEDALS[position - 1] || position}
      </span>
      {children}
    </div>
  );
}

export function ClubRankings({ clubId }: { clubId: string }) {
  const now = new Date();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClubRankingsData | null>(null);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('all');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  const { startDate, endDate } = useMemo(() => {
    if (periodMode === 'all') return { startDate: null, endDate: null };
    const start = periodMode === 'year' ? new Date(year, 0, 1) : new Date(year, month - 1, 1);
    const end = periodMode === 'year' ? new Date(year + 1, 0, 1) : new Date(year, month, 1);
    return { startDate: dateKey(start), endDate: dateKey(end) };
  }, [periodMode, year, month]);

  useEffect(() => {
    let cancelled = false;

    const fetchRankings = async () => {
      setLoading(true);
      try {
        const { data: result, error } = await supabase.rpc('get_club_rankings', {
          p_club_id: clubId,
          p_start_date: startDate ?? undefined,
          p_end_date: endDate ?? undefined,
        });
        if (error) throw error;
        if (!cancelled) setData(result as unknown as ClubRankingsData);
      } catch (error) {
        console.error('Error fetching club rankings:', error);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRankings();
    return () => {
      cancelled = true;
    };
  }, [clubId, startDate, endDate]);

  const periodFilter = (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <Tabs value={periodMode} onValueChange={(v) => setPeriodMode(v as PeriodMode)}>
        <TabsList className="grid grid-cols-3 w-full sm:w-auto">
          <TabsTrigger value="all">Tudo</TabsTrigger>
          <TabsTrigger value="year">Ano</TabsTrigger>
          <TabsTrigger value="month">Mês</TabsTrigger>
        </TabsList>
      </Tabs>
      {periodMode !== 'all' && (
        <div className="flex gap-2">
          {periodMode === 'month' && (
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={name} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {periodFilter}
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data || data.total_books === 0) {
    return (
      <div className="space-y-6">
        {periodFilter}
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Nenhum ranking ainda</h3>
            <p className="text-muted-foreground">
              {periodMode === 'all'
                ? 'Assim que as integrantes marcarem livros como lidos, os rankings do clube aparecem aqui!'
                : 'Nenhum livro lido pelo clube nesse período.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {periodFilter}
      <div className="rounded-xl bg-gradient-enchanted p-6 flex flex-wrap items-center justify-around gap-4 text-center text-foreground">
        <div>
          <p className="text-3xl font-bold">{data.total_books}</p>
          <p className="text-sm opacity-80">livros lidos pelo clube</p>
        </div>
        <div>
          <p className="text-3xl font-bold">{data.total_pages.toLocaleString('pt-BR')}</p>
          <p className="text-sm opacity-80">páginas viradas</p>
        </div>
        <div>
          <p className="text-3xl font-bold">{data.member_count}</p>
          <p className="text-sm opacity-80">integrantes ativas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-enchanted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-primary" />
              Maiores leitoras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.top_readers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há dados suficientes.</p>
            ) : (
              data.top_readers.map((r, i) => (
                <RankRow key={r.user_id} position={i + 1}>
                  <Link to={`/perfil/${r.user_id}`} className="flex-1 flex items-center gap-3 min-w-0 hover:underline">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={r.avatar_url ?? undefined} />
                      <AvatarFallback>{r.display_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate flex-1">{r.display_name || 'Leitora'}</span>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {r.completed_count} livro{r.completed_count === 1 ? '' : 's'}
                    </span>
                  </Link>
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
            {data.top_authors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há dados suficientes.</p>
            ) : (
              data.top_authors.map((a, i) => (
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

        <Card className="card-enchanted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="h-5 w-5 text-primary" />
              Gêneros favoritos do clube
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.top_genres.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há dados suficientes.</p>
            ) : (
              data.top_genres.map((g, i) => (
                <RankRow key={g.genre} position={i + 1}>
                  <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{g.genre}</span>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {g.count} livro{g.count === 1 ? '' : 's'}
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
              <BookMarked className="h-5 w-5 text-primary" />
              Livros mais favoritados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.top_books.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há avaliações suficientes.</p>
            ) : (
              data.top_books.map((b, i) => (
                <RankRow key={`${b.title}-${i}`} position={i + 1}>
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    {b.cover_url ? (
                      <img src={b.cover_url} alt={b.title} className="w-9 h-12 object-cover rounded shrink-0" />
                    ) : (
                      <div className="w-9 h-12 rounded bg-muted shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{b.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{b.author || 'Autor desconhecido'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {b.avg_rating} · {b.lovers_count}
                    </span>
                  </div>
                </RankRow>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
