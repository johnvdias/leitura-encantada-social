import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image as ImageIcon, Share2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { READING_EMOTIONS } from "@/lib/readingEmotions";
import { generateReadingProgressImageBlob } from "@/lib/generateReadingProgressImage";
import { shareImageBlob } from "@/lib/share";
import { useToast } from "@/hooks/use-toast";

interface ShareProgressDialogProps {
  bookTitle: string;
  bookAuthor: string;
  coverUrl: string | null;
  currentPage: number | null;
  totalPages: number | null;
  readingProgress: number | null;
  children: React.ReactNode;
}

type ProgressMode = 'percent' | 'pages';

export function ShareProgressDialog({
  bookTitle,
  bookAuthor,
  coverUrl,
  currentPage,
  totalPages,
  readingProgress,
  children,
}: ShareProgressDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ProgressMode>('percent');
  const [percentValue, setPercentValue] = useState(readingProgress || 0);
  const [pageValue, setPageValue] = useState(currentPage || 0);
  const [totalPagesValue, setTotalPagesValue] = useState(totalPages || 0);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [sharingBg, setSharingBg] = useState(false);
  const [sharingTransparent, setSharingTransparent] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const { toast } = useToast();

  const toggleEmotion = (id: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const progressLabel =
    mode === 'percent' ? `${percentValue}%` : `${pageValue}/${totalPagesValue || '?'} págs`;

  const buildImage = async (transparent: boolean) => {
    const emotions = READING_EMOTIONS.filter((e) => selectedEmotions.includes(e.id));
    return generateReadingProgressImageBlob(
      { title: bookTitle, author: bookAuthor, coverUrl, progressLabel, emotions },
      transparent
    );
  };

  // Prévia ao vivo, sobre fundo escuro (a versão transparente também fica
  // clara de ver assim - o que muda na exportada é só o fillRect de fundo).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRendering(true);
    buildImage(false).then((blob) => {
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
  }, [open, mode, percentValue, pageValue, totalPagesValue, selectedEmotions, coverUrl]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleShare = async (transparent: boolean) => {
    const setLoading = transparent ? setSharingTransparent : setSharingBg;
    setLoading(true);
    try {
      const blob = await buildImage(transparent);
      if (!blob) {
        toast({ title: 'Não foi possível gerar a imagem', variant: 'destructive' });
        return;
      }
      const filename = transparent ? 'progresso-leitura-transparente.png' : 'progresso-leitura.png';
      const result = await shareImageBlob(blob, filename, bookTitle);
      if (result === 'downloaded') {
        toast({ title: 'Imagem baixada!', description: 'Agora é só compartilhar onde quiser.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Compartilhar progresso
          </DialogTitle>
          <DialogDescription>Gere uma imagem pra compartilhar como está a leitura.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden bg-black flex items-center justify-center aspect-[1200/520]">
            {rendering && !previewUrl ? (
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            ) : previewUrl ? (
              <img src={previewUrl} alt="Prévia do card de progresso" className="w-full h-full object-contain" />
            ) : (
              <p className="text-sm text-white/60">Não foi possível gerar a prévia.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Mostrar progresso como</Label>
            <Tabs value={mode} onValueChange={(v) => setMode(v as ProgressMode)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="percent">Porcentagem</TabsTrigger>
                <TabsTrigger value="pages">Páginas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {mode === 'percent' ? (
            <div className="space-y-2">
              <Label htmlFor="progress-percent">Porcentagem lida</Label>
              <Input
                id="progress-percent"
                type="number"
                min={0}
                max={100}
                value={percentValue === 0 ? "" : percentValue}
                onChange={(e) =>
                  setPercentValue(e.target.value === "" ? 0 : Math.min(100, Math.max(0, Number(e.target.value))))
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="progress-page">Página atual</Label>
                <Input
                  id="progress-page"
                  type="number"
                  min={0}
                  value={pageValue === 0 ? "" : pageValue}
                  onChange={(e) => setPageValue(e.target.value === "" ? 0 : Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="progress-total">Total de páginas</Label>
                <Input
                  id="progress-total"
                  type="number"
                  min={0}
                  value={totalPagesValue === 0 ? "" : totalPagesValue}
                  onChange={(e) => setTotalPagesValue(e.target.value === "" ? 0 : Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Como você está se sentindo? (escolha quantas quiser)</Label>
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
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: emotion.color }}
                    />
                    {emotion.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" onClick={() => handleShare(false)} disabled={sharingBg || rendering}>
              {sharingBg ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
              Com fundo
            </Button>
            <Button variant="outline" onClick={() => handleShare(true)} disabled={sharingTransparent || rendering}>
              {sharingTransparent ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
              Fundo transparente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
