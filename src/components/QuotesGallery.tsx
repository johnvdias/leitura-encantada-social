import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Quote as QuoteIcon, Share2, Trash2 } from "lucide-react";
import { useBookQuotes } from "@/hooks/useBookQuotes";
import { shareText } from "@/lib/share";
import { useToast } from "@/hooks/use-toast";

export function QuotesGallery() {
  const { quotes, loading, removeQuote } = useBookQuotes();
  const { toast } = useToast();

  const handleShare = async (content: string, title: string, author: string) => {
    const text = `"${content}"\n— ${title}, ${author}`;
    const result = await shareText(text, title);
    if (result === 'copied') {
      toast({ title: 'Citação copiada!', description: 'Cole onde quiser compartilhar.' });
    } else if (result === 'failed') {
      toast({ title: 'Não foi possível compartilhar', variant: 'destructive' });
    }
  };

  if (loading) {
    return <p className="text-center text-muted-foreground py-10">Carregando citações...</p>;
  }

  if (quotes.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <QuoteIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma citação salva ainda</h3>
          <p className="text-muted-foreground">
            Guarde trechos marcantes dos seus livros pelo botão de citações na sua estante.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {quotes.map((quote) => (
        <Card key={quote.id}>
          <CardContent className="pt-6 space-y-3">
            <p className="italic">"{quote.content}"</p>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{quote.books?.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {quote.books?.author}
                  {quote.page_number ? ` · p. ${quote.page_number}` : ''}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleShare(quote.content, quote.books?.title || '', quote.books?.author || '')}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeQuote(quote.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
