import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Loader2, BookCopy } from "lucide-react";
import { TablesInsert, Tables } from "@/integrations/supabase/types";
import { normalizeIsbn, isIsbn10, isIsbn13 } from "@/lib/isbn";
import { GenreSelect } from "@/components/GenreSelect";
import { CompletedDatePicker } from "@/components/CompletedDatePicker";
import { BookFormatSelect } from "@/components/BookFormatSelect";
import { BookFormat } from "@/lib/bookFormats";
import { format } from "date-fns";

type CatalogMatch = Tables<"book_catalog">;

interface ManualBookDialogProps {
  onBookAdded: () => void;
}

type ReadingStatus = "reading" | "completed" | "want_to_read";

const initialFormData = {
  title: "",
  author: "",
  pages: 0,
  genre: "",
  format: "physical" as BookFormat,
  cover_url: "",
  reading_status: "want_to_read" as ReadingStatus,
  isbn_10: "",
  isbn_13: "",
  publisher: "",
  published_date: "",
  language: "",
  description: "",
};

export function ManualBookDialog({ onBookAdded }: ManualBookDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [completedDate, setCompletedDate] = useState<Date | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [catalogMatch, setCatalogMatch] = useState<CatalogMatch | null>(null);
  const [checkingCatalog, setCheckingCatalog] = useState(false);
  const [usingCatalogMatch, setUsingCatalogMatch] = useState(false);

  const handleCoverUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, cover_url: e.target.value });
    setCoverPreview(e.target.value);
  };

  // Antes de deixar cadastrar do zero, checa (com debounce) se esse livro já
  // está no catálogo compartilhado - por ISBN, ou por título+autora quando
  // não há ISBN. Sem isso, a usuária não tinha como saber que outra pessoa já
  // cadastrou o mesmo livro, e acabava criando uma entrada duplicada no
  // catálogo (com dados possivelmente divergentes) sem necessidade.
  useEffect(() => {
    const isbn10 = formData.isbn_10.trim() ? normalizeIsbn(formData.isbn_10) : null;
    const isbn13 = formData.isbn_13.trim() ? normalizeIsbn(formData.isbn_13) : null;
    const title = formData.title.trim();
    const author = formData.author.trim();

    const hasIsbn = (isbn10 && isIsbn10(isbn10)) || (isbn13 && isIsbn13(isbn13));
    if (!hasIsbn && (!title || !author)) {
      setCatalogMatch(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setCheckingCatalog(true);
      try {
        let query = supabase.from("book_catalog").select("*").limit(1);
        if (isbn13 && isIsbn13(isbn13)) {
          query = query.eq("isbn_13", isbn13);
        } else if (isbn10 && isIsbn10(isbn10)) {
          query = query.eq("isbn_10", isbn10);
        } else {
          query = query.ilike("title", title).ilike("authors", author);
        }
        const { data } = await query.maybeSingle();
        setCatalogMatch(data as CatalogMatch | null);
      } catch (error) {
        console.error("Error checking book catalog:", error);
      } finally {
        setCheckingCatalog(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [formData.isbn_10, formData.isbn_13, formData.title, formData.author]);

  const handleUseCatalogMatch = async () => {
    if (!user || !catalogMatch) return;
    setUsingCatalogMatch(true);
    try {
      const { error } = await supabase.from("books").insert({
        user_id: user.id,
        title: catalogMatch.title,
        author: catalogMatch.authors || "",
        pages: catalogMatch.page_count,
        genre: catalogMatch.genre,
        format: formData.format,
        cover_url: catalogMatch.cover_url,
        description: catalogMatch.description,
        reading_status: formData.reading_status,
        completed_at: formData.reading_status === "completed"
          ? format(completedDate ?? new Date(), "yyyy-MM-dd")
          : null,
      } satisfies TablesInsert<"books">);

      if (error) throw error;

      toast({
        title: "Livro Adicionado! 📚",
        description: `"${catalogMatch.title}" já estava no catálogo e foi adicionado à sua estante.`,
      });

      setOpen(false);
      onBookAdded();
      setFormData(initialFormData);
      setCompletedDate(null);
      setCoverPreview(null);
      setCatalogMatch(null);
    } catch (error) {
      console.error("Error adding catalog book:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o livro.",
        variant: "destructive",
      });
    } finally {
      setUsingCatalogMatch(false);
    }
  };

  // Só título e autora são obrigatórios - o resto é o que a usuária souber
  // (esse cadastro existe justamente pra livros que as APIs não acham).
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title.trim() || !formData.author.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha ao menos o título e a autora.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const isbn10 = formData.isbn_10.trim() ? normalizeIsbn(formData.isbn_10) : null;
      const isbn13 = formData.isbn_13.trim() ? normalizeIsbn(formData.isbn_13) : null;

      if (isbn10 && !isIsbn10(isbn10)) {
        toast({ title: "ISBN-10 inválido", description: "Confira o número digitado.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (isbn13 && !isIsbn13(isbn13)) {
        toast({ title: "ISBN-13 inválido", description: "Confira o número digitado.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Livro cadastrado manualmente entra pro catálogo compartilhado pra
      // sempre - a próxima pessoa que procurar por ele encontra direto,
      // sem precisar cadastrar de novo.
      await supabase.rpc('upsert_book_catalog', {
        p_title: formData.title.trim(),
        p_authors: formData.author.trim(),
        p_isbn_10: isbn10,
        p_isbn_13: isbn13,
        p_publisher: formData.publisher.trim() || null,
        p_published_date: formData.published_date.trim() || null,
        p_page_count: formData.pages > 0 ? formData.pages : null,
        p_language: formData.language.trim() || null,
        p_description: formData.description.trim() || null,
        p_cover_url: formData.cover_url.trim() || null,
        p_genre: formData.genre.trim() || null,
        p_source: 'manual',
      });

      const newBook: TablesInsert<"books"> = {
        user_id: user.id,
        title: formData.title.trim(),
        author: formData.author.trim(),
        pages: formData.pages > 0 ? formData.pages : null,
        genre: formData.genre.trim() || null,
        format: formData.format,
        cover_url: formData.cover_url || null,
        description: formData.description.trim() || null,
        reading_status: formData.reading_status,
        completed_at: formData.reading_status === 'completed'
          ? format(completedDate ?? new Date(), "yyyy-MM-dd")
          : null,
      };

      const { error } = await supabase.from("books").insert(newBook);

      if (error) throw error;

      toast({
        title: "Livro Adicionado! 📚",
        description: `"${formData.title}" foi adicionado à sua estante e ao catálogo do Leitura Encantada.`,
      });

      setOpen(false);
      onBookAdded();
      setFormData(initialFormData);
      setCompletedDate(null);
      setCoverPreview(null);
      setCatalogMatch(null);
    } catch (error) {
      console.error("Error adding book manually:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o livro.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          Cadastrar Manualmente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Livro no Leitura Encantada</DialogTitle>
          <DialogDescription>
            Não achamos esse livro nas nossas fontes? Cadastre você mesma - só título e autora são obrigatórios.
            Se alguém já cadastrou o mesmo livro, avisamos assim que você preencher o título e a autora (ou o ISBN).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="author">Autora(s) *</Label>
            <Input
              id="author"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              required
            />
          </div>

          {checkingCatalog && (
            <p className="text-xs text-muted-foreground">Checando se esse livro já existe no catálogo...</p>
          )}

          {catalogMatch && (
            <Alert>
              <BookCopy className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-3">
                  {catalogMatch.cover_url ? (
                    <img
                      src={catalogMatch.cover_url}
                      alt={catalogMatch.title}
                      className="h-14 w-10 object-cover rounded shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-10 rounded bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      Esse livro já está no catálogo (alguém já cadastrou):
                    </p>
                    <p className="text-sm font-medium truncate">{catalogMatch.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{catalogMatch.authors}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full mt-3"
                  onClick={handleUseCatalogMatch}
                  disabled={usingCatalogMatch}
                >
                  {usingCatalogMatch && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Usar esse livro em vez de cadastrar de novo
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="isbn_13">ISBN-13</Label>
              <Input
                id="isbn_13"
                value={formData.isbn_13}
                onChange={(e) => setFormData({ ...formData, isbn_13: e.target.value })}
                placeholder="978..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="isbn_10">ISBN-10</Label>
              <Input
                id="isbn_10"
                value={formData.isbn_10}
                onChange={(e) => setFormData({ ...formData, isbn_10: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="publisher">Editora</Label>
            <Input
              id="publisher"
              value={formData.publisher}
              onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="published_date">Ano de publicação</Label>
              <Input
                id="published_date"
                value={formData.published_date}
                onChange={(e) => setFormData({ ...formData, published_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pages">Número de Páginas</Label>
              <Input
                id="pages"
                type="number"
                min="1"
                value={formData.pages === 0 ? "" : formData.pages}
                onChange={(e) => setFormData({ ...formData, pages: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Idioma</Label>
            <Input
              id="language"
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              placeholder="Português"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="genre">Gênero</Label>
            <GenreSelect
              value={formData.genre}
              onChange={(genre) => setFormData({ ...formData, genre })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="format">Formato</Label>
            <BookFormatSelect
              value={formData.format}
              onChange={(bookFormat) => setFormData({ ...formData, format: bookFormat })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status da Leitura</Label>
            <Select
              value={formData.reading_status}
              onValueChange={(value: ReadingStatus) => setFormData({ ...formData, reading_status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="want_to_read">Quero Ler</SelectItem>
                <SelectItem value="reading">Lendo</SelectItem>
                <SelectItem value="completed">Lido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.reading_status === 'completed' && (
            <CompletedDatePicker value={completedDate} onChange={setCompletedDate} />
          )}
          <div className="space-y-2">
            <Label htmlFor="cover_url">URL da Capa (Opcional)</Label>
            <Input
              id="cover_url"
              value={formData.cover_url}
              onChange={handleCoverUrlChange}
              placeholder="https://exemplo.com/capa.jpg"
            />
          </div>
          {coverPreview && (
            <div className="flex justify-center">
              <img
                src={coverPreview}
                alt="Pré-visualização da capa"
                className="h-48 w-32 object-cover rounded-md border"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar Livro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
