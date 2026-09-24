import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Share2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { shareImageBlob } from "@/lib/share";
import {
  generateRetrospectiveImageBlob,
  RetrospectiveBackgroundMode,
  RetrospectiveStats,
} from "@/lib/generateRetrospectiveImage";
import { READING_EMOTIONS } from "@/lib/readingEmotions";
import { useToast } from "@/hooks/use-toast";

type PeriodMode = 'year' | 'month';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DEFAULT_SOLID_COLOR = "#7c3aed";
const DEFAULT_TEXT_COLOR = "#ffffff";

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

export function RetrospectiveDialog() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const now = new Date();
  const [periodMode, setPeriodMode] = useState<PeriodMode>('year');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [background, setBackground] = useState<RetrospectiveBackgroundMode>('cover');
  const [solidColor, setSolidColor] = useState(DEFAULT_SOLID_COLOR);
  const [customTextColor, setCustomTextColor] = useState<string | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);

  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState<RetrospectiveStats | null>(null);
  const [rendering, setRendering] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const periodLabel = periodMode === 'year' ? String(year) : `${MONTH_NAMES[month - 1]} de ${year}`;

  const toggleEmotion = (id: string) => {
    setSelectedEmotions((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  };

  // Busca as estatísticas do período (ano ou mês) sempre que ele muda.
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;

    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const start = periodMode === 'year' ? `${year}-01-01` : `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = periodMode === 'year' ? new Date(year + 1, 0, 1) : new Date(year, month, 1);
        const end = dateKey(endDate);

        const { data: books } = await supabase
          .from('books')
          .select('genre, author, pages, title, cover_url, rating, reading_status, updated_at, completed_at')
          .eq('user_id', user.id)
          .eq('reading_status', 'completed');

        const completedInPeriod = (books || []).filter((b) => {
          const effectiveDate = b.completed_at ?? b.updated_at.slice(0, 10);
          return effectiveDate >= start && effectiveDate < end;
        });

        const genreCount = new Map<string, number>();
        const authorCount = new Map<string, number>();
        let totalPages = 0;
        completedInPeriod.forEach((b) => {
          if (b.genre) genreCount.set(b.genre, (genreCount.get(b.genre) || 0) + 1);
          if (b.author) authorCount.set(b.author, (authorCount.get(b.author) || 0) + 1);
          totalPages += b.pages || 0;
        });

        const topGenre = [...genreCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        const topAuthor = [...authorCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        const rated = completedInPeriod.filter((b) => (b.rating || 0) > 0);
        const favoriteSource = rated.length > 0
          ? [...rated].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
          : [...completedInPeriod].sort((a, b) => {
              const dateA = a.completed_at ?? a.updated_at.slice(0, 10);
              const dateB = b.completed_at ?? b.updated_at.slice(0, 10);
              return dateB.localeCompare(dateA);
            })[0];

        const startISO = `${start}T00:00:00.000Z`;
        const endISO = `${end}T00:00:00.000Z`;
        const { data: history } = await supabase
          .from('reading_history')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', startISO)
          .lt('created_at', endISO);

        const longestStreak = computeLongestStreak((history || []).map((h) => dateKey(new Date(h.created_at))));

        if (!cancelled) {
          setStats({
            completedCount: completedInPeriod.length,
            topGenre,
            topAuthor,
            totalPages,
            longestStreak,
            favoriteBook: favoriteSource
              ? { title: favoriteSource.title, coverUrl: favoriteSource.cover_url, rating: favoriteSource.rating }
              : null,
          });
        }
      } catch (error) {
        console.error('Error fetching retrospective stats:', error);
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [open, user, periodMode, year, month]);

  // Regenera a prévia sempre que as estatísticas ou a personalização mudam.
  useEffect(() => {
    if (!open || !stats) return;
    let cancelled = false;
    setRendering(true);

    const emotions = READING_EMOTIONS.filter((e) => selectedEmotions.includes(e.id));
    generateRetrospectiveImageBlob({
      periodLabel,
      stats,
      emotions,
      displayName: profile?.display_name,
      background: { mode: background, color: solidColor },
      textColor: customTextColor ?? undefined,
    }).then((blob) => {
      if (cancelled) return;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = blob ? URL.createObjectURL(blob) : null;
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setRendering(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stats, background, solidColor, customTextColor, selectedEmotions, periodLabel]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleShare = async () => {
    if (!stats) return;
    setSharing(true);
    try {
      const emotions = READING_EMOTIONS.filter((e) => selectedEmotions.includes(e.id));
      const blob = await generateRetrospectiveImageBlob({
        periodLabel,
        stats,
        emotions,
        displayName: profile?.display_name,
        background: { mode: background, color: solidColor },
        textColor: customTextColor ?? undefined,
      });
      if (!blob) {
        toast({ title: 'Não foi possível gerar a imagem', variant: 'destructive' });
        return;
      }

      const result = await shareImageBlob(blob, `retrospectiva.png`, `Retrospectiva - ${periodLabel}`);
      if (result === 'downloaded') {
        toast({ title: 'Imagem baixada!', description: 'Agora é só compartilhar onde quiser.' });
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Retrospectiva
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Retrospectiva
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={cn(
              "rounded-lg overflow-hidden flex items-center justify-center bg-[repeating-conic-gradient(#4b5563_0%_25%,#374151_0%_50%)] bg-[length:20px_20px]",
              "aspect-[1080/1350] max-h-[420px] mx-auto"
            )}
          >
            {loadingStats || (rendering && !previewUrl) ? (
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            ) : previewUrl ? (
              <img src={previewUrl} alt="Prévia da retrospectiva" className="w-full h-full object-contain" />
            ) : (
              <p className="text-sm text-white/60 text-center px-4">
                {stats ? 'Não foi possível gerar a prévia.' : 'Nenhum livro lido nesse período ainda.'}
              </p>
            )}
          </div>

          <Button onClick={handleShare} disabled={sharing || rendering || !stats} className="w-full">
            {sharing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
            Gerar imagem e compartilhar
          </Button>

          <div className="space-y-2">
            <Label>Período</Label>
            <Tabs value={periodMode} onValueChange={(v) => setPeriodMode(v as PeriodMode)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="year">Ano</TabsTrigger>
                <TabsTrigger value="month">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className={cn("grid gap-3", periodMode === 'month' ? "grid-cols-2" : "grid-cols-1")}>
            {periodMode === 'month' && (
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, i) => (
                      <SelectItem key={name} value={String(i + 1)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Personalização</Label>
            <RadioGroup
              value={background}
              onValueChange={(v) => setBackground(v as RetrospectiveBackgroundMode)}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="cover" id="retro-bg-cover" />
                <Label htmlFor="retro-bg-cover" className="font-normal cursor-pointer">Capa do livro favorito</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="solid" id="retro-bg-solid" />
                <Label htmlFor="retro-bg-solid" className="font-normal cursor-pointer">Cor sólida</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="transparent" id="retro-bg-transparent" />
                <Label htmlFor="retro-bg-transparent" className="font-normal cursor-pointer">Transparente</Label>
              </div>
            </RadioGroup>
          </div>

          {background === 'solid' && (
            <div className="space-y-2">
              <Label htmlFor="retro-solid-color">Cor do fundo</Label>
              <div className="flex items-center gap-2">
                <input
                  id="retro-solid-color"
                  type="color"
                  value={solidColor}
                  onChange={(e) => setSolidColor(e.target.value)}
                  className="h-10 w-14 rounded-md border cursor-pointer bg-transparent p-0"
                />
                <Input
                  value={solidColor}
                  onChange={(e) => setSolidColor(e.target.value)}
                  className="flex-1 uppercase"
                  maxLength={7}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="retro-text-color-toggle" className="cursor-pointer">
                Personalizar cor do texto
              </Label>
              <Switch
                id="retro-text-color-toggle"
                checked={customTextColor !== null}
                onCheckedChange={(checked) => setCustomTextColor(checked ? DEFAULT_TEXT_COLOR : null)}
              />
            </div>
            {customTextColor !== null && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customTextColor}
                  onChange={(e) => setCustomTextColor(e.target.value)}
                  className="h-10 w-14 rounded-md border cursor-pointer bg-transparent p-0"
                />
                <Input
                  value={customTextColor}
                  onChange={(e) => setCustomTextColor(e.target.value)}
                  className="flex-1 uppercase"
                  maxLength={7}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Como foi esse período pra você? (escolha quantas quiser)</Label>
            <div className="flex flex-wrap gap-2">
              {READING_EMOTIONS.map((emotion) => {
                const active = selectedEmotions.includes(emotion.id);
                return (
                  <button
                    key={emotion.id}
                    type="button"
                    onClick={() => toggleEmotion(emotion.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      active ? "border-primary bg-primary/10" : "border-input hover:bg-muted"
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: emotion.color }} />
                    {emotion.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
