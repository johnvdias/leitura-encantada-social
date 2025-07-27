import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Edit, Star, Trash2 } from "lucide-react";
import { EditBookDialog } from "@/components/EditBookDialog";
import { UpdateProgressDialog } from "@/components/UpdateProgressDialog";
import { CreatePostDialog } from "@/components/CreatePostDialog";
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


// Definindo a interface para o objeto Book
interface Book {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
    pages: number | null;
    reading_status: 'reading' | 'completed' | 'want_to_read';
    reading_progress: number;
    description: string | null;
    genre: string | null;
    rating: number | null;
    personal_notes: string | null;
    tags: string[] | null;
  }

// A prop do componente agora é o objeto book e o callback onUpdate
interface BookCardProps {
  book: Book;
  onUpdate: () => void;
}

const BookCard = ({ book, onUpdate }: BookCardProps) => {
  const { toast } = useToast();

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
  }

  return (
    <Card className="flex flex-col">
      <CardContent className="p-4 flex-grow">
        <div className="flex gap-4">
            <div className="w-24 flex-shrink-0">
                <img src={book.cover_url || '/placeholder.svg'} alt={book.title} className="w-full h-36 object-cover rounded-md" />
            </div>
            <div className="flex flex-col min-w-0">
                <Badge variant={book.reading_status === 'reading' ? 'default' : 'outline'} className="self-start mb-1">{getStatusLabel(book.reading_status)}</Badge>
                <h3 className="font-bold truncate" title={book.title}>{book.title}</h3>
                <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                {book.rating && (
                    <div className="flex items-center mt-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < book.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />)}
                    </div>
                )}
            </div>
        </div>

        {book.reading_status === 'reading' && book.pages && book.pages > 0 && (
            <div className="mt-4">
                <Progress value={book.reading_progress || 0} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 text-right">{book.reading_progress || 0}%</p>
            </div>
        )}
      </CardContent>
      
      <div className="p-4 pt-0 flex flex-wrap gap-2 justify-end">
        {book.reading_status === 'reading' && (
            <UpdateProgressDialog book={book} onProgressUpdate={onUpdate}>
                <Button variant="outline" size="sm">Atualizar</Button>
            </UpdateProgressDialog>
        )}
        <CreatePostDialog bookId={book.id}>
             <Button variant="outline" size="sm">Compartilhar</Button>
        </CreatePostDialog>
        <EditBookDialog book={book} onBookUpdated={onUpdate} />
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
    </Card>
  );
};

export default BookCard;
