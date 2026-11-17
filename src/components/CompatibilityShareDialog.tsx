import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Share2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateCompatibilityImageBlob,
  CompatibilityBackgroundMode,
} from "@/lib/generateCompatibilityImage";
import { shareImageBlob } from "@/lib/share";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_SOLID_COLOR = "#7c3aed";
const DEFAULT_TEXT_COLOR = "#ffffff";

interface CompatibilityShareDialogProps {
  percentage: number;
  commonBooks: number;
  myName: string;
  myAvatarUrl: string | null;
  otherName: string;
  otherAvatarUrl: string | null;
  children: React.ReactNode;
}

export function CompatibilityShareDialog({
  percentage,
  commonBooks,
  myName,
  myAvatarUrl,
  otherName,
  otherAvatarUrl,
  children,
}: CompatibilityShareDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const [background, setBackground] = useState<CompatibilityBackgroundMode>('gradient');
  const [solidColor, setSolidColor] = useState(DEFAULT_SOLID_COLOR);
  const [customTextColor, setCustomTextColor] = useState<string | null>(null);

  const [rendering, setRendering] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  const buildImage = () =>
    generateCompatibilityImageBlob({
      percentage,
      commonBooks,
      myName,
      myAvatarUrl,
      otherName,
      otherAvatarUrl,
      background: { mode: background, color: solidColor },
      textColor: customTextColor ?? undefined,
    });

  // Regenera a prévia sempre que a personalização muda - mesmo padrão do
  // RetrospectiveDialog.
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
  }, [open, background, solidColor, customTextColor]);

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
      const result = await shareImageBlob(
        blob,
        'compatibilidade-literaria.png',
        'Compatibilidade Literária',
        `${percentage}% de afinidade com ${otherName}!`
      );
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
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Criar card de compatibilidade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={cn(
              "rounded-lg overflow-hidden flex items-center justify-center bg-[repeating-conic-gradient(#4b5563_0%_25%,#374151_0%_50%)] bg-[length:20px_20px]",
              "aspect-square max-h-[420px] mx-auto"
            )}
          >
            {rendering && !previewUrl ? (
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            ) : previewUrl ? (
              <img src={previewUrl} alt="Prévia do card de compatibilidade" className="w-full h-full object-contain" />
            ) : (
              <p className="text-sm text-white/60 text-center px-4">Não foi possível gerar a prévia.</p>
            )}
          </div>

          <Button onClick={handleShare} disabled={sharing || rendering} className="w-full">
            {sharing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
            Gerar imagem e compartilhar
          </Button>

          <div className="space-y-2">
            <Label>Personalização</Label>
            <RadioGroup
              value={background}
              onValueChange={(v) => setBackground(v as CompatibilityBackgroundMode)}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="gradient" id="compat-bg-gradient" />
                <Label htmlFor="compat-bg-gradient" className="font-normal cursor-pointer">Gradiente</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="solid" id="compat-bg-solid" />
                <Label htmlFor="compat-bg-solid" className="font-normal cursor-pointer">Cor sólida</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="transparent" id="compat-bg-transparent" />
                <Label htmlFor="compat-bg-transparent" className="font-normal cursor-pointer">Transparente</Label>
              </div>
            </RadioGroup>
          </div>

          {background === 'solid' && (
            <div className="space-y-2">
              <Label htmlFor="compat-solid-color">Cor do fundo</Label>
              <div className="flex items-center gap-2">
                <input
                  id="compat-solid-color"
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
              <Label htmlFor="compat-text-color-toggle" className="cursor-pointer">
                Personalizar cor do texto
              </Label>
              <Switch
                id="compat-text-color-toggle"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
