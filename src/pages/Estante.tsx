import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import BookCard from "@/components/BookCard/BookCard";
import { AddBookDialog } from "@/components/AddBookDialog";
import { ManualBookDialog } from "@/components/ManualBookDialog";
import { ReadingGoals } from "@/components/ReadingGoals";
import { SchedulesSection } from "@/components/SchedulesSection";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Book } from "@/types/book";

const Estante = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8">
          <TabsTrigger value="lendo">Lendo ({readingBooks.length})</TabsTrigger>
          <TabsTrigger value="lidos">Lidos ({completedBooks.length})</TabsTrigger>
          <TabsTrigger value="quero-ler">Quero Ler ({wantToReadBooks.length})</TabsTrigger>
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {wantToReadBooks.map((book) => <BookCard key={book.id} book={book} onUpdate={fetchBooks} />)}
            </div>
          ) : <p className="text-center text-muted-foreground py-10">Sua lista de desejos está vazia.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Estante;
