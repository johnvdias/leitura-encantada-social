import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, BookOpen, Trophy, Flame, Hash, Share2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { shareText } from "@/lib/share";
import { useToast } from "@/hooks/use-toast";

interface WrappedStats {
  completedCount: number;
  topGenre: string | null;
  topAuthor: string | null;
  totalPages: number;
  longestStreak: number;
}

const dateKey = (d: Date) => d.toISOString().slice(0, 10);

const computeLongestStreak = (isoDates: string[]): number => {
  const days = Array.from(new Set(isoDates)).sort();
  if (days.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
    current = diffDays === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
};

export function YearlyWrapped() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const year = new Date().getFullYear();

  const fetchWrapped = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const yearStart = `${year}-01-01T00:00:00.000Z`;
      const yearEnd = `${year + 1}-01-01T00:00:00.000Z`;

      const { data: books } = await supabase
        .from('books')
        .select('genre, author, pages, reading_status, updated_at')
        .eq('user_id', user.id);

      const completedThisYear = (books || []).filter(
        (b) => b.reading_status === 'completed' && b.updated_at >= yearStart && b.updated_at < yearEnd
      );

      const genreCount = new Map<string, number>();
      const authorCount = new Map<string, number>();
      let totalPages = 0;
      completedThisYear.forEach((b) => {
        if (b.genre) genreCount.set(b.genre, (genreCount.get(b.genre) || 0) + 1);
        if (b.author) authorCount.set(b.author, (authorCount.get(b.author) || 0) + 1);
        totalPages += b.pages || 0;
      });

      const topGenre = [...genreCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const topAuthor = [...authorCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      const { data: history } = await supabase
        .from('reading_history')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', yearStart)
        .lt('created_at', yearEnd);

      const longestStreak = computeLongestStreak((history || []).map((h) => dateKey(new Date(h.created_at))));

      setStats({
        completedCount: completedThisYear.length,
        topGenre,
        topAuthor,
        totalPages,
        longestStreak,
      });
    } catch (error) {
      console.error('Error fetching yearly wrapped:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !stats) fetchWrapped();
  };

  const handleShare = async () => {
    if (!stats) return;
    const lines = [
      `📚 Minha retrospectiva de leitura ${year}`,
      `${stats.completedCount} livro(s) lido(s)`,
      stats.topGenre ? `Gênero favorito: ${stats.topGenre}` : null,
      stats.topAuthor ? `Autora mais lida: ${stats.topAuthor}` : null,
      stats.totalPages > 0 ? `${stats.totalPages} páginas viradas` : null,
      stats.longestStreak > 1 ? `Sequência de ${stats.longestStreak} dias seguidos lendo` : null,
    ].filter(Boolean);

    const result = await shareText(lines.join('\n'), `Retrospectiva ${year}`);
    if (result === 'copied') {
      toast({ title: 'Copiado!', description: 'Cole onde quiser compartilhar sua retrospectiva.' });
    } else if (result === 'failed') {
      toast({ title: 'Não foi possível compartilhar', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Retrospectiva {year}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sua retrospectiva de {year}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-gradient-enchanted p-6 text-center text-foreground">
              <p className="text-5xl font-bold">{stats.completedCount}</p>
              <p className="text-sm opacity-80">livro(s) lido(s) em {year}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 text-center space-y-1">
                <BookOpen className="h-5 w-5 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold truncate">{stats.topGenre || '—'}</p>
                <p className="text-xs text-muted-foreground">Gênero favorito</p>
              </div>
              <div className="rounded-lg border p-3 text-center space-y-1">
                <Trophy className="h-5 w-5 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold truncate">{stats.topAuthor || '—'}</p>
                <p className="text-xs text-muted-foreground">Autora mais lida</p>
              </div>
              <div className="rounded-lg border p-3 text-center space-y-1">
                <Hash className="h-5 w-5 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold">{stats.totalPages}</p>
                <p className="text-xs text-muted-foreground">Páginas viradas</p>
              </div>
              <div className="rounded-lg border p-3 text-center space-y-1">
                <Flame className="h-5 w-5 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold">{stats.longestStreak} dia(s)</p>
                <p className="text-xs text-muted-foreground">Maior sequência</p>
              </div>
            </div>

            <Button onClick={handleShare} className="w-full">
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Não foi possível carregar sua retrospectiva.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
