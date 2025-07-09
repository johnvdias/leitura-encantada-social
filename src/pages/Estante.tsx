import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Plus, Library, BookOpen, CheckCircle } from "lucide-react";
import BookCard from "@/components/BookCard/BookCard";

const Estante = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data for books
  const mockBooks = [
    {
      title: "Orgulho e Preconceito",
      author: "Jane Austen",
      progress: 75,
      status: "reading" as const,
      genre: "Romance",
      currentPage: 180,
      totalPages: 240,
      lastRead: "hoje"
    },
    {
      title: "O Pequeno Príncipe",
      author: "Antoine de Saint-Exupéry",
      progress: 100,
      status: "completed" as const,
      genre: "Fábula",
      rating: 5
    },
    {
      title: "Dom Casmurro",
      author: "Machado de Assis",
      progress: 0,
      status: "want-to-read" as const,
      genre: "Ficção"
    }
  ];

  const readingBooks = mockBooks.filter(book => book.status === "reading");
  const completedBooks = mockBooks.filter(book => book.status === "completed");
  const wantToReadBooks = mockBooks.filter(book => book.status === "want-to-read");

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
        <Button className="btn-enchanted">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Livro
        </Button>
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
            {readingBooks.map((book, index) => (
              <BookCard key={index} {...book} />
            ))}
          </div>
          {readingBooks.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum livro sendo lido no momento</p>
              <Button className="btn-enchanted mt-4">
                Começar uma Nova Leitura
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lidos" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {completedBooks.map((book, index) => (
              <BookCard key={index} {...book} />
            ))}
          </div>
          {completedBooks.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum livro finalizado ainda</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quero-ler" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {wantToReadBooks.map((book, index) => (
              <BookCard key={index} {...book} />
            ))}
          </div>
          {wantToReadBooks.length === 0 && (
            <div className="text-center py-12">
              <Library className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Sua lista de desejos está vazia</p>
              <Button className="btn-enchanted mt-4">
                Descobrir Novos Livros
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Estante;