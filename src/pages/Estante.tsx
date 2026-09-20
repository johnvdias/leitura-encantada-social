import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Dices, Loader2 } from "lucide-react";
import BookCard from "@/components/BookCard/BookCard";
import { AddBookDialog } from "@/components/AddBookDialog";
import { ManualBookDialog } from "@/components/ManualBookDialog";
import { ReadingGoals } from "@/components/ReadingGoals";
import { SchedulesSection } from "@/components/SchedulesSection";
import { FriendRecommendations } from "@/components/FriendRecommendations";
import { BibliotecaEncantada } from "@/components/BibliotecaEncantada";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Book } from "@/types/book";

const Estante = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickedBook, setPickedBook] = useState<Book | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [startingPicked, setStartingPicked] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchBooks = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks(data as Book[] || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const readingBooks = filteredBooks.filter(book => book.reading_status === "reading");
  const completedBooks = filteredBooks.filter(book => book.reading_status === "completed");
  const wantToReadBooks = filteredBooks.filter(book => book.reading_status === "want_to_read");

  const handleDrawRandomBook = () => {
    if (wantToReadBooks.length === 0) return;
    const randomBook = wantToReadBooks[Math.floor(Math.random() * wantToReadBooks.length)];
    setPickedBook(randomBook);
    setPickerOpen(true);
  };

  const handleStartPickedBook = async () => {
    if (!pickedBook) return;
    setStartingPicked(true);
    try {
      const { error } = await supabase
        .from('books')
        .update({ reading_status: 'reading' })
        .eq('id', pickedBook.id);
      if (error) throw error;
      toast({
        title: "Boa leitura! 📖",
        description: `Você começou a ler "${pickedBook.title}".`,
      });
      setPickerOpen(false);
      await fetchBooks();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o status do livro.', variant: 'destructive' });
    } finally {
      setStartingPicked(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">Minha Estante</h1>
        <p className="text-muted-foreground">Organize seus livros e acompanhe seu progresso.</p>
      </header>

      <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ReadingGoals />
        <SchedulesSection />
      </section>

      <FriendRecommendations />

      <Separator className="my-8" />

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <div className="relative w-full sm:w-auto sm:flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                  placeholder="Pesquisar em sua estante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
              />
          </div>
          <div className="flex gap-2">
            <AddBookDialog onBookAdded={fetchBooks} />
            <ManualBookDialog onBookAdded={fetchBooks} />
          </div>
      </div>

      <Tabs defaultValue="lendo" className="w-full">
        <TabsList className="flex w-full items-center justify-start overflow-x-auto sm:grid sm:grid-cols-4 gap-1 max-w-2xl mx-auto mb-8">
          <TabsTrigger value="lendo" className="shrink-0">Lendo ({readingBooks.length})</TabsTrigger>
          <TabsTrigger value="lidos" className="shrink-0">Lidos ({completedBooks.length})</TabsTrigger>
          <TabsTrigger value="quero-ler" className="shrink-0">Quero Ler ({wantToReadBooks.length})</TabsTrigger>
          <TabsTrigger value="biblioteca" className="shrink-0">Biblioteca Encantada</TabsTrigger>
        </TabsList>

        <TabsContent value="lendo">
          {readingBooks.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {readingBooks.map((book) => <BookCard key={book.id} book={book} onUpdate={fetchBooks} />)}
            </div>
          ) : <p className="text-center text-muted-foreground py-10">Nenhum livro sendo lido.</p>}
        </TabsContent>

        <TabsContent value="lidos">
         {completedBooks.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {completedBooks.map((book) => <BookCard key={book.id} book={book} onUpdate={fetchBooks} />)}
            </div>
          ) : <p className="text-center text-muted-foreground py-10">Nenhum livro concluído ainda.</p>}
        </TabsContent>

        <TabsContent value="quero-ler">
          {wantToReadBooks.length > 0 ? (
            <>
              <div className="flex justify-center mb-6">
                <Button variant="outline" onClick={handleDrawRandomBook}>
                  <Dices className="h-4 w-4 mr-2" />
                  Sortear meu próximo livro
                </Button>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {wantToReadBooks.map((book) => <BookCard key={book.id} book={book} onUpdate={fetchBooks} />)}
              </div>
            </>
          ) : <p className="text-center text-muted-foreground py-10">Sua lista de desejos está vazia.</p>}
        </TabsContent>

        <TabsContent value="biblioteca">
          <BibliotecaEncantada />
        </TabsContent>
      </Tabs>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>O sorteio escolheu... 🎲</DialogTitle>
            <DialogDescription>Que tal começar por esse?</DialogDescription>
          </DialogHeader>
          {pickedBook && (
            <div className="flex flex-col items-center text-center gap-4 py-2">
              <img
                src={pickedBook.cover_url || '/placeholder.svg'}
                alt={pickedBook.title}
                className="h-48 w-32 object-cover rounded-md shadow-md"
              />
              <div>
                <p className="font-bold text-lg">{pickedBook.title}</p>
                <p className="text-sm text-muted-foreground">{pickedBook.author}</p>
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={handleDrawRandomBook} className="flex-1">
                  <Dices className="h-4 w-4 mr-2" />
                  Sortear outro
                </Button>
                <Button onClick={handleStartPickedBook} disabled={startingPicked} className="flex-1">
                  {startingPicked && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Começar a ler
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Estante;
