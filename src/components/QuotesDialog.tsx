import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { Quote, Share2, Trash2, Loader2 } from "lucide-react";
import { useBookQuotes } from "@/hooks/useBookQuotes";
import { shareText } from "@/lib/share";
import { useToast } from "@/hooks/use-toast";

interface QuotesDialogProps {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
}

export function QuotesDialog({ bookId, bookTitle, bookAuthor }: QuotesDialogProps) {
  const { quotes, loading, addQuote, removeQuote } = useBookQuotes(bookId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [pageNumber, setPageNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await addQuote(content, pageNumber ? parseInt(pageNumber, 10) : undefined);
      setContent("");
      setPageNumber("");
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async (quoteContent: string) => {
    const text = `"${quoteContent}"\n— ${bookTitle}, ${bookAuthor}`;
    const result = await shareText(text, bookTitle);
    if (result === 'copied') {
      toast({ title: 'Citação copiada!', description: 'Cole onde quiser compartilhar.' });
    } else if (result === 'failed') {
      toast({ title: 'Não foi possível compartilhar', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" title="Citações">
          <Quote className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Citações</DialogTitle>
          <DialogDescription>{bookTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            placeholder="Digite ou cole o trecho que você quer guardar..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="page-number" className="sr-only">Página</Label>
              <Input
                id="page-number"
                type="number"
                min="1"
                placeholder="Página (opcional)"
                value={pageNumber}
                onChange={(e) => setPageNumber(e.target.value)}
              />
            </div>
            <Button onClick={handleAdd} disabled={saving || !content.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pt-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma citação salva ainda.</p>
          ) : (
            quotes.map((quote) => (
              <div key={quote.id} className="rounded-lg border p-3 space-y-2">
                <p className="text-sm italic">"{quote.content}"</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {quote.page_number ? `Página ${quote.page_number}` : ''}
                  </span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleShare(quote.content)}>
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeQuote(quote.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
