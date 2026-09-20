import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Trash2, Play, Loader2 } from "lucide-react"; // Corrigido: Trocado BookPlay por Play
import { EditBookDialog } from "@/components/EditBookDialog";
import { UpdateProgressDialog } from "@/components/UpdateProgressDialog";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { QuotesDialog } from "@/components/QuotesDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import type { Book } from "@/types/book";

// A prop do componente agora é o objeto book e o callback onUpdate
interface BookCardProps {
  book: Book;
  onUpdate: () => void;
}

const BookCard = ({ book, onUpdate }: BookCardProps) => {
  const { toast } = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const getStatusLabel = (status: string) => {
    if (status === 'reading') return 'Lendo';
    if (status === 'completed') return 'Lido';
    return 'Quero Ler';
  };
  
  const handleDeleteBook = async () => {
    const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', book.id);
    if(error){
        toast({ title: 'Erro', description: 'Não foi possível remover o livro', variant: 'destructive'})
    } else {
        toast({ title: 'Sucesso', description: 'Livro removido da sua estante.'})
        onUpdate();
    }
  };

  const handleRate = async (rating: number) => {
    try {
      const { error } = await supabase
        .from('books')
        .update({ rating: rating === book.rating ? null : rating })
        .eq('id', book.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar sua avaliação.', variant: 'destructive' });
    }
  };

  const handleStartReading = async () => {
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('books')
        .update({ reading_status: 'reading' })
        .eq('id', book.id);

      if (error) throw error;
      
      toast({
        title: "Boa leitura! 📖",
        description: `Você começou a ler "${book.title}".`,
      });
      onUpdate(); // Atualiza a lista de livros
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o status do livro.', variant: 'destructive' });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardContent className="p-4 flex-grow">
        <div className="flex gap-4">
            <div className="w-24 flex-shrink-0">
                <img src={book.cover_url || '/placeholder.svg'} alt={book.title} className="w-full h-36 object-cover rounded-md" />
            </div>
            <div className="flex flex-col min-w-0">
                <Badge variant={book.reading_status === 'reading' ? 'default' : 'outline'} className="self-start mb-1">{getStatusLabel(book.reading_status)}</Badge>
                <h3 className="font-bold truncate" title={book.title}>{book.title}</h3>
                <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                {book.reading_status === 'completed' ? (
                    <div className="flex items-center mt-1" aria-label="Avaliar livro">
                        {[...Array(5)].map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleRate(i + 1)}
                            className="p-0.5 -m-0.5"
                          >
                            <Star className={`h-4 w-4 ${i < (book.rating ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                          </button>
                        ))}
                    </div>
                ) : book.rating ? (
                    <div className="flex items-center mt-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < book.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />)}
                    </div>
                ) : null}
            </div>
        </div>

        {book.reading_status === 'reading' && book.pages && book.pages > 0 && (
            <div className="mt-4">
                <Progress value={book.reading_progress || 0} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 text-right">{book.reading_progress || 0}%</p>
            </div>
        )}
      </CardContent>
      
      <div className="p-4 pt-0 mt-auto">
        <div className="flex flex-wrap gap-2 justify-end">
            {book.reading_status === 'want_to_read' && (
              <Button onClick={handleStartReading} disabled={isUpdatingStatus} size="sm" className="flex-grow sm:flex-grow-0">
                {isUpdatingStatus ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" /> // Corrigido: Trocado BookPlay por Play
                )}
                Começar a Ler
              </Button>
            )}

            {book.reading_status === 'reading' && (
                <UpdateProgressDialog
                    bookId={book.id}
                    title={book.title}
                    currentPage={book.current_page}
                    totalPages={book.pages}
                    currentProgress={book.reading_progress}
                    onProgressUpdate={onUpdate}
                >
                    <Button variant="outline" size="sm" className="flex-grow sm:flex-grow-0">Atualizar</Button>
                </UpdateProgressDialog>
            )}
            
            {/* O botão de compartilhar agora só aparece para livros sendo lidos ou já lidos */}
            {(book.reading_status === 'reading' || book.reading_status === 'completed') && (
              <CreatePostDialog bookId={book.id} onPostCreated={onUpdate}>
                  <Button variant="outline" size="sm" className="flex-grow sm:flex-grow-0">Compartilhar</Button>
              </CreatePostDialog>
            )}
            
            <EditBookDialog
                bookId={book.id}
                title={book.title}
                author={book.author}
                pages={book.pages}
                genre={book.genre ?? ''}
                description={book.description ?? undefined}
                coverUrl={book.cover_url}
                status={book.reading_status}
                onBookUpdated={onUpdate}
            />

            <QuotesDialog bookId={book.id} bookTitle={book.title} bookAuthor={book.author} />

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4"/>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação removerá permanentemente o livro "{book.title}" da sua estante.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteBook}>Sim, remover</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
    </Card>
  );
};

export default BookCard;
