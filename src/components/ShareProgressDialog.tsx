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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Image as ImageIcon, Share2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { READING_EMOTIONS } from "@/lib/readingEmotions";
import {
  generateReadingProgressImageBlob,
  CardLayout,
  BackgroundMode,
} from "@/lib/generateReadingProgressImage";
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

const DEFAULT_SOLID_COLOR = "#7c3aed";
const DEFAULT_TEXT_COLOR = "#ffffff";

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
  const [layout, setLayout] = useState<CardLayout>('story');
  const [background, setBackground] = useState<BackgroundMode>('cover');
  const [solidColor, setSolidColor] = useState(DEFAULT_SOLID_COLOR);
  const [customTextColor, setCustomTextColor] = useState<string | null>(null);
  const [mode, setMode] = useState<ProgressMode>('percent');
  const [percentValue, setPercentValue] = useState(readingProgress || 0);
  const [pageValue, setPageValue] = useState(currentPage || 0);
  const [totalPagesValue, setTotalPagesValue] = useState(totalPages || 0);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [sharing, setSharing] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const { toast } = useToast();

  const toggleEmotion = (id: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const progressLabel =
    mode === 'percent' ? `${percentValue}%` : `${pageValue}/${totalPagesValue || '?'} págs`;

  const buildImage = async () => {
    const emotions = READING_EMOTIONS.filter((e) => selectedEmotions.includes(e.id));
    return generateReadingProgressImageBlob({
      title: bookTitle,
      author: bookAuthor,
      coverUrl,
      progressLabel,
      emotions,
      layout,
      background: { mode: background, color: solidColor },
      textColor: customTextColor ?? undefined,
    });
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRendering(true);
    buildImage().then((blob) => {
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
  }, [open, layout, background, solidColor, customTextColor, mode, percentValue, pageValue, totalPagesValue, selectedEmotions, coverUrl]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await buildImage();
      if (!blob) {
        toast({ title: 'Não foi possível gerar a imagem', variant: 'destructive' });
        return;
      }
      const result = await shareImageBlob(blob, 'progresso-leitura.png', bookTitle);
      if (result === 'downloaded') {
        toast({ title: 'Imagem baixada!', description: 'Agora é só compartilhar onde quiser.' });
      }
    } finally {
      setSharing(false);
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
          <div
            className={cn(
              "rounded-lg overflow-hidden flex items-center justify-center bg-[repeating-conic-gradient(#4b5563_0%_25%,#374151_0%_50%)] bg-[length:20px_20px]",
              layout === 'story' ? "aspect-[1080/1920] max-h-[420px] mx-auto" : "aspect-[1200/520]"
            )}
          >
            {rendering && !previewUrl ? (
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            ) : previewUrl ? (
              <img src={previewUrl} alt="Prévia do card de progresso" className="w-full h-full object-contain" />
            ) : (
              <p className="text-sm text-white/60">Não foi possível gerar a prévia.</p>
            )}
          </div>

          <Button onClick={handleShare} disabled={sharing || rendering} className="w-full">
            {sharing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
            Gerar imagem e compartilhar
          </Button>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <RadioGroup value={layout} onValueChange={(v) => setLayout(v as CardLayout)} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="story" id="layout-story" />
                <Label htmlFor="layout-story" className="font-normal cursor-pointer">Story</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="miniature" id="layout-miniature" />
                <Label htmlFor="layout-miniature" className="font-normal cursor-pointer">Miniatura</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Personalização</Label>
            <RadioGroup
              value={background}
              onValueChange={(v) => setBackground(v as BackgroundMode)}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="cover" id="bg-cover" />
                <Label htmlFor="bg-cover" className="font-normal cursor-pointer">Capa livro</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="solid" id="bg-solid" />
                <Label htmlFor="bg-solid" className="font-normal cursor-pointer">Cor sólida</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="transparent" id="bg-transparent" />
                <Label htmlFor="bg-transparent" className="font-normal cursor-pointer">Transparente</Label>
              </div>
            </RadioGroup>
          </div>

          {background === 'solid' && (
            <div className="space-y-2">
              <Label htmlFor="solid-color">Cor do fundo</Label>
              <div className="flex items-center gap-2">
                <input
                  id="solid-color"
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
              <Label htmlFor="custom-text-color-toggle" className="cursor-pointer">
                Personalizar cor do texto
              </Label>
              <Switch
                id="custom-text-color-toggle"
                checked={customTextColor !== null}
                onCheckedChange={(checked) =>
                  setCustomTextColor(checked ? DEFAULT_TEXT_COLOR : null)
                }
              />
            </div>
            {customTextColor !== null && (
              <div className="flex items-center gap-2">
                <input
                  id="text-color"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
