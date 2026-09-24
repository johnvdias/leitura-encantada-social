import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GenreSelect } from "@/components/GenreSelect";
import { BookFormatSelect } from "@/components/BookFormatSelect";
import { CompletedDatePicker } from "@/components/CompletedDatePicker";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { BookFormat } from "@/lib/bookFormats";
import { format as formatDate } from "date-fns";

type ReadingStatus = "reading" | "completed" | "want_to_read";

export interface RecommendedBookInfo {
  title: string;
  author: string;
  cover_url: string | null;
  genre: string | null;
  format: BookFormat;
  pages: number | null;
  description: string | null;
}

interface AddRecommendedBookDialogProps {
  book: RecommendedBookInfo;
  onBookAdded: () => void;
  children: React.ReactNode;
}

export function AddRecommendedBookDialog({ book, onBookAdded, children }: AddRecommendedBookDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ReadingStatus>("want_to_read");
  // Pré-preenchidos com o que a amiga já tinha cadastrado - a usuária só
  // ajusta se quiser, não precisa digitar tudo de novo.
  const [genre, setGenre] = useState(book.genre ?? "");
  const [bookFormat, setBookFormat] = useState<BookFormat>(book.format);
  const [completedDate, setCompletedDate] = useState<Date | null>(null);

  const handleAdd = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("books").insert({
        user_id: user.id,
        title: book.title,
        author: book.author,
        cover_url: book.cover_url,
        description: book.description,
        pages: book.pages,
        genre: genre || null,
        format: bookFormat,
        reading_status: status,
        reading_progress: status === "completed" ? 100 : 0,
        completed_at: status === "completed" ? formatDate(completedDate ?? new Date(), "yyyy-MM-dd") : null,
      });

      if (error) throw error;

      toast({
        title: "Livro adicionado! 📚",
        description: `"${book.title}" foi adicionado à sua estante.`,
      });

      setOpen(false);
      setStatus("want_to_read");
      setCompletedDate(null);
      onBookAdded();
    } catch (error) {
      console.error("Error adding recommended book:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o livro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <img
              src={book.cover_url || "/placeholder.svg"}
              alt={book.title}
              className="h-16 w-11 object-cover rounded shrink-0"
            />
            <div className="min-w-0">
              <p className="truncate">{book.title}</p>
              <p className="text-sm font-normal text-muted-foreground truncate">{book.author}</p>
            </div>
          </DialogTitle>
          <DialogDescription>Adicionar essa recomendação à sua estante</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rec-status">Status</Label>
            <Select value={status} onValueChange={(v: ReadingStatus) => setStatus(v)}>
              <SelectTrigger id="rec-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="want_to_read">Quero Ler</SelectItem>
                <SelectItem value="reading">Lendo</SelectItem>
                <SelectItem value="completed">Lido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === "completed" && (
            <CompletedDatePicker value={completedDate} onChange={setCompletedDate} />
          )}

          <div className="space-y-2">
            <Label htmlFor="rec-genre">Gênero</Label>
            <GenreSelect value={genre} onChange={setGenre} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rec-format">Formato</Label>
            <BookFormatSelect value={bookFormat} onChange={setBookFormat} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar à Estante
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
