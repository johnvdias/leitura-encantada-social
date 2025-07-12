
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Library, BookOpen, CheckCircle } from "lucide-react";
import BookCard from "@/components/BookCard/BookCard";
import { AddBookDialog } from "@/components/AddBookDialog";
import { ReadingGoals } from "@/components/ReadingGoals";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  pages: number | null;
  genre: string;
  reading_status: 'reading' | 'completed' | 'want_to_read';
  reading_progress: number;
  description: string;
  current_page?: number;
  last_read_at?: string;
  rating?: number;
  personal_notes?: string;
  tags?: string[];
}

const Estante = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchBooks = async () => {
    if (!user) return;

    try {
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
  };

  useEffect(() => {
    fetchBooks();
  }, [user]);

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const readingBooks = filteredBooks.filter(book => book.reading_status === "reading");
  const completedBooks = filteredBooks.filter(book => book.reading_status === "completed");
  const wantToReadBooks = filteredBooks.filter(book => book.reading_status === "want_to_read");

  // Calculate reading statistics
  const totalBooks = books.length;
  const readingCount = readingBooks.length;
  const completedCount = completedBooks.length;
  const averageProgress = readingBooks.length > 0 
    ? Math.round(readingBooks.reduce((sum, book) => sum + book.reading_progress, 0) / readingBooks.length)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-enchanted text-enchanted mb-4">
          Minha Estante Encantada
        </h1>
        <p className="text-muted-foreground text-lg">
          Organize seus livros e acompanhe sua jornada literária
        </p>
        
        {/* Quick Stats */}
        <div className="flex justify-center gap-6 mt-6 text-sm text-muted-foreground">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{totalBooks}</div>
            <div>Total de livros</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{readingCount}</div>
            <div>Lendo atualmente</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{completedCount}</div>
            <div>Livros concluídos</div>
          </div>
          {readingCount > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{averageProgress}%</div>
              <div>Progresso médio</div>
            </div>
          )}
        </div>
      </div>

      {/* Reading Goals */}
      <div className="max-w-md mx-auto mb-8">
        <ReadingGoals />
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-8 max-w-2xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar livros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filtrar
        </Button>
        <AddBookDialog onBookAdded={fetchBooks} />
      </div>

      {/* Tabs for different book categories */}
      <Tabs defaultValue="lendo" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8">
          <TabsTrigger value="lendo" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Lendo ({readingBooks.length})
          </TabsTrigger>
          <TabsTrigger value="lidos" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Lidos ({completedBooks.length})
          </TabsTrigger>
          <TabsTrigger value="quero-ler" className="flex items-center gap-2">
            <Library className="w-4 h-4" />
            Quero Ler ({wantToReadBooks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lendo" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {readingBooks.map((book) => (
              <BookCard 
                key={book.id}
                id={book.id}
                title={book.title}
                author={book.author}
                cover={book.cover_url || undefined}
                progress={book.reading_progress}
                status={book.reading_status}
                genre={book.genre}
                currentPage={book.current_page || 0}
                totalPages={book.pages || 0}
                lastRead={book.last_read_at ? new Date(book.last_read_at).toLocaleDateString('pt-BR') : undefined}
                description={book.description}
                rating={book.rating}
                personalNotes={book.personal_notes}
                tags={book.tags}
                onUpdate={fetchBooks}
              />
            ))}
          </div>
          {readingBooks.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Nenhum livro sendo lido no momento</p>
              <p className="text-sm text-muted-foreground mb-4">
                Comece sua jornada de leitura adicionando um livro!
              </p>
              <AddBookDialog onBookAdded={fetchBooks} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="lidos" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {completedBooks.map((book) => (
              <BookCard 
                key={book.id}
                id={book.id}
                title={book.title}
                author={book.author}
                cover={book.cover_url || undefined}
                progress={book.reading_progress}
                status={book.reading_status}
                genre={book.genre}
                rating={book.rating}
                description={book.description}
                personalNotes={book.personal_notes}
                tags={book.tags}
                onUpdate={fetchBooks}
              />
            ))}
          </div>
          {completedBooks.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Nenhum livro finalizado ainda</p>
              <p className="text-sm text-muted-foreground mb-4">
                Complete um livro para vê-lo aqui e celebrar sua conquista!
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quero-ler" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {wantToReadBooks.map((book) => (
              <BookCard 
                key={book.id}
                id={book.id}
                title={book.title}
                author={book.author}
                cover={book.cover_url || undefined}
                progress={book.reading_progress}
                status={book.reading_status}
                genre={book.genre}
                description={book.description}
                rating={book.rating}
                personalNotes={book.personal_notes}
                tags={book.tags}
                onUpdate={fetchBooks}
              />
            ))}
          </div>
          {wantToReadBooks.length === 0 && (
            <div className="text-center py-12">
              <Library className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Sua lista de desejos está vazia</p>
              <p className="text-sm text-muted-foreground mb-4">
                Adicione livros que você gostaria de ler no futuro!
              </p>
              <AddBookDialog onBookAdded={fetchBooks} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Estante;
