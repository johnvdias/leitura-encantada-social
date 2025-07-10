import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Loader2, BookOpen, User, FileText, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface BookResult {
  id: string;
  title: string;
  author: string;
  description: string;
  pages: number | null;
  genre: string;
  cover_url: string | null;
  isbn: string | null;
}

interface AddBookDialogProps {
  onBookAdded: () => void;
}

export function AddBookDialog({ onBookAdded }: AddBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const searchBooks = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const response = await supabase.functions.invoke('search-books', {
        body: { query }
      });

      if (response.error) {
        throw response.error;
      }

      setSearchResults(response.data.books || []);
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
      const { error } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
          title: book.title,
          author: book.author,
          description: book.description,
          pages: book.pages,
          genre: book.genre,
          cover_url: book.cover_url,
          reading_status: status,
          reading_progress: status === 'completed' ? 100 : 0,
        });

      if (error) throw error;

      toast({
        title: "Livro adicionado!",
        description: `"${book.title}" foi adicionado à sua estante.`,
      });

      setOpen(false);
      setQuery("");
      setSearchResults([]);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Livro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Adicionar Novo Livro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Digite o título do livro..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchBooks()}
              className="flex-1"
            />
            <Button onClick={searchBooks} disabled={isSearching || !query.trim()}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">
                Resultados da busca
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.map((book) => (
                  <Card key={book.id} className="hover:shadow-md transition-shadow">
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
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <User className="h-3 w-3" />
                            <span className="truncate">{book.author}</span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                            {book.pages && (
                              <div className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                <span>{book.pages} pág.</span>
                              </div>
                            )}
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              {book.genre}
                            </Badge>
                          </div>

                          {book.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                              {book.description.substring(0, 120)}...
                            </p>
                          )}

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

          {!isSearching && searchResults.length === 0 && query && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum livro encontrado para "{query}"</p>
              <p className="text-sm">Tente usar palavras-chave diferentes</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}