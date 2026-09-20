import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Download, Loader2, Trash2, LibraryBig } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLibraryBooks } from "@/hooks/useLibraryBooks";
import { AddLibraryBookDialog } from "@/components/AddLibraryBookDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function BibliotecaEncantada() {
  const { profile } = useAuth();
  const { books, loading, downloadingId, downloadBook, removeBook } = useLibraryBooks();
  const [search, setSearch] = useState("");

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-enchanted text-enchanted">Biblioteca Encantada</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Livros de domínio público e autorais prontos pra baixar em EPUB e levar pro seu Kindle
          (use o "Enviar para Kindle" da Amazon depois de baixar).
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
        <div className="relative w-full sm:w-auto sm:flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na biblioteca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {profile?.is_admin && <AddLibraryBookDialog />}
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-10">Carregando biblioteca...</p>
      ) : filteredBooks.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <LibraryBig className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">
              {books.length === 0 ? 'A biblioteca ainda está vazia' : 'Nenhum livro encontrado'}
            </h3>
            <p className="text-muted-foreground">
              {books.length === 0 ? 'Em breve teremos livros por aqui.' : 'Tente buscar por outro título ou autora.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBooks.map((book) => (
            <Card key={book.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <img
                  src={book.cover_url || '/placeholder.svg'}
                  alt={book.title}
                  className="h-40 w-28 object-cover rounded-md shadow mb-3"
                />
                <h3 className="font-semibold text-sm leading-tight truncate w-full" title={book.title}>
                  {book.title}
                </h3>
                <p className="text-xs text-muted-foreground truncate w-full mb-2">{book.author}</p>
                {book.genre && (
                  <Badge variant="secondary" className="text-xs mb-2 max-w-full truncate">
                    {book.genre}
                  </Badge>
                )}
                <div className="flex gap-2 w-full mt-2">
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => downloadBook(book)}
                    disabled={downloadingId === book.id}
                  >
                    {downloadingId === book.id ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5 mr-1" />
                    )}
                    Baixar EPUB
                  </Button>
                  {profile?.is_admin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover livro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{book.title}" será removido da Biblioteca Encantada pra sempre.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeBook(book)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
