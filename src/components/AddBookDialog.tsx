import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Loader2, BookOpen, User, FileText, Hash, ScanLine, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { isValidIsbn } from "@/lib/isbn";
import { ManualBookDialog } from "@/components/ManualBookDialog";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { BookFormatSelect } from "@/components/BookFormatSelect";
import { BookFormat } from "@/lib/bookFormats";
import { format } from "date-fns";

interface BookResult {
  id: string;
  title: string;
  author: string;
  description: string;
  pages: number | null;
  genre: string;
  cover_url: string | null;
  isbn: string | null;
  isbn_10: string | null;
  isbn_13: string | null;
  publisher: string | null;
  published_date: string | null;
  language: string | null;
  source: 'catalog' | 'google_books' | 'open_library';
  catalog_id: string | null;
  google_books_id: string | null;
  open_library_id: string | null;
}

interface AddBookDialogProps {
  onBookAdded: () => void;
}

const SOURCE_LABEL: Record<BookResult['source'], string> = {
  catalog: 'Catálogo Leitura Encantada',
  google_books: 'Google Books',
  open_library: 'Open Library',
};

export function AddBookDialog({ onBookAdded }: AddBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [formats, setFormats] = useState<Record<string, BookFormat>>({});
  const { user } = useAuth();
  const { toast } = useToast();

  const getFormat = (bookId: string) => formats[bookId] ?? 'physical';

  // "978..." já dá pra reconhecer como provável ISBN antes de buscar - só
  // um aviso visual, a detecção de verdade acontece no backend.
  const looksLikeIsbn = useMemo(() => isValidIsbn(query.trim()), [query]);
  const looksLikeAmazonLink = useMemo(() => /^https?:\/\/(www\.)?(amazon\.[a-z.]+|a\.co)\//i.test(query.trim()), [query]);

  const searchBooks = async (overrideQuery?: string) => {
    const searchQuery = overrideQuery ?? query;
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await supabase.functions.invoke('search-books', {
        body: { query: searchQuery }
      });

      if (response.error) {
        throw response.error;
      }

      setSearchResults(response.data.books || []);
      setHasSearched(true);
    } catch (error) {
      console.error('Error searching books:', error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar livros. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const addBook = async (book: BookResult, status: 'reading' | 'want_to_read' | 'completed') => {
    if (!user) return;

    setIsAdding(true);
    try {
      // Livro achado numa API externa passa a existir no catálogo próprio -
      // a próxima busca por ele (de qualquer usuária) não precisa mais
      // consultar Google Books/Open Library. Livro que já veio do catálogo
      // não precisa passar por aqui de novo.
      if (book.source !== 'catalog') {
        await supabase.rpc('upsert_book_catalog', {
          p_title: book.title,
          p_authors: book.author,
          p_isbn_10: book.isbn_10,
          p_isbn_13: book.isbn_13,
          p_publisher: book.publisher,
          p_published_date: book.published_date,
          p_page_count: book.pages,
          p_language: book.language,
          p_description: book.description,
          p_cover_url: book.cover_url,
          p_source: book.source,
          p_google_books_id: book.google_books_id,
          p_open_library_id: book.open_library_id,
          p_genre: book.genre,
        });
      }

      const { error } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
          title: book.title,
          author: book.author,
          description: book.description,
          pages: book.pages,
          genre: book.genre,
          format: getFormat(book.id),
          cover_url: book.cover_url,
          reading_status: status,
          reading_progress: status === 'completed' ? 100 : 0,
          completed_at: status === 'completed' ? format(new Date(), 'yyyy-MM-dd') : null,
        });

      if (error) throw error;

      toast({
        title: "Livro adicionado!",
        description: `"${book.title}" foi adicionado à sua estante.`,
      });

      setOpen(false);
      setQuery("");
      setSearchResults([]);
      setHasSearched(false);
      onBookAdded();
    } catch (error) {
      console.error('Error adding book:', error);
      toast({
        title: "Erro ao adicionar livro",
        description: "Não foi possível adicionar o livro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleBarcodeDetected = (code: string) => {
    setQuery(code);
    setHasSearched(false);
    searchBooks(code);
  };

  const handleManualBookAdded = () => {
    setOpen(false);
    setQuery("");
    setSearchResults([]);
    setHasSearched(false);
    onBookAdded();
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Livro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Adicionar Novo Livro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Digite título, autora ou ISBN..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHasSearched(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && searchBooks()}
              className="w-full"
            />
            <Button
              onClick={() => searchBooks()}
              disabled={isSearching || !query.trim()}
              className="w-full sm:w-auto shrink-0 gap-2"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="sm:hidden">Buscar</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setScannerOpen(true)}
              className="w-full sm:w-auto shrink-0 gap-2"
              title="Escanear código de barras"
            >
              <Camera className="h-4 w-4" />
              <span className="sm:hidden">Escanear</span>
            </Button>
          </div>

          {(looksLikeIsbn || looksLikeAmazonLink) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ScanLine className="h-3 w-3" />
              {looksLikeAmazonLink ? "Buscando pelo link da Amazon" : "Buscando pelo ISBN"}
            </p>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">
                Resultados da busca
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.map((book) => (
                  <Card key={book.id} className="hover:shadow-md transition-shadow overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-16 h-24 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-16 h-24 bg-muted rounded border flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm leading-tight mb-1 truncate">
                            {book.title}
                          </h4>

                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 min-w-0">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate min-w-0">{book.author}</span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
                            {book.pages && (
                              <div className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                <span>{book.pages} pág.</span>
                              </div>
                            )}
                            <Badge variant="secondary" className="text-xs px-2 py-0.5 max-w-[160px] truncate">
                              {book.genre}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground/70">
                              {SOURCE_LABEL[book.source]}
                            </span>
                          </div>

                          {book.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                              {book.description.substring(0, 120)}...
                            </p>
                          )}

                          <BookFormatSelect
                            value={getFormat(book.id)}
                            onChange={(bookFormat) =>
                              setFormats((prev) => ({ ...prev, [book.id]: bookFormat }))
                            }
                            className="h-7 w-auto text-xs mb-2 px-2 gap-1"
                          />

                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => addBook(book, 'reading')}
                              disabled={isAdding}
                              className="text-xs px-3 py-1 h-7"
                            >
                              Estou Lendo
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addBook(book, 'want_to_read')}
                              disabled={isAdding}
                              className="text-xs px-3 py-1 h-7"
                            >
                              Quero Ler
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => addBook(book, 'completed')}
                              disabled={isAdding}
                              className="text-xs px-3 py-1 h-7"
                            >
                              Já Li
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!isSearching && hasSearched && searchResults.length === 0 && (
            <div className="text-center py-8 text-muted-foreground space-y-4">
              <div>
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>
                  {looksLikeAmazonLink
                    ? "Não conseguimos identificar esse livro pelo link da Amazon."
                    : looksLikeIsbn
                      ? "Não encontramos esse ISBN nas nossas fontes."
                      : "Não encontramos esse livro no nosso catálogo."}
                </p>
                {!looksLikeIsbn && !looksLikeAmazonLink && (
                  <p className="text-sm">Tente buscar pelo ISBN ou cadastre o livro você mesma</p>
                )}
              </div>
              <div className="flex justify-center">
                <ManualBookDialog onBookAdded={handleManualBookAdded} />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <BarcodeScannerDialog
      open={scannerOpen}
      onOpenChange={setScannerOpen}
      onDetected={handleBarcodeDetected}
    />
    </>
  );
}
