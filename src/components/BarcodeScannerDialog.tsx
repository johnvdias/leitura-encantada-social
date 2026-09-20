import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
}

export function BarcodeScannerDialog({ open, onOpenChange, onDetected }: BarcodeScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();

        if (cancelled || !videoRef.current) return;

        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current,
          (result) => {
            if (result) {
              onDetected(result.getText());
              controlsRef.current?.stop();
              onOpenChange(false);
            }
          }
        );

        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
        }
      } catch (err) {
        console.error("Error starting barcode scanner:", err);
        if (!cancelled) {
          setError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
        }
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onDetected, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Escanear código de barras</DialogTitle>
          <DialogDescription>Aponte a câmera para o código de barras (ISBN) na contracapa do livro.</DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="text-center py-8 text-muted-foreground space-y-2">
            <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden bg-black aspect-square">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
