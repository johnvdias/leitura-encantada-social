import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Users, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Profile, Book, Club } from "@/types";
import { useNavigate } from "react-router-dom";

interface SearchResults {
  users: Profile[];
  books: Book[];
  clubs: Club[];
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    users: [],
    books: [],
    clubs: [],
  });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ users: [], books: [], clubs: [] });
      return;
    }

    setLoading(true);
    try {
      // Buscar usuários
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .ilike("display_name", `%${searchQuery}%`)
        .limit(5);

      // Buscar livros
      const { data: books, error: booksError } = await supabase
        .from("books")
        .select("*")
        .or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`)
        .limit(5);

      // Buscar clubes
      const { data: clubs, error: clubsError } = await supabase
        .from("clubs")
        .select("*")
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(5);

      if (!usersError && !booksError && !clubsError) {
        setResults({
          users: users || [],
          books: books || [],
          clubs: clubs || [],
        });
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.length >= 2) {
      performSearch(value);
      setIsOpen(true);
    } else {
      setResults({ users: [], books: [], clubs: [] });
      setIsOpen(false);
    }
  };

  const handleResultClick = (type: string, item: any) => {
    if (type === "user") {
      // Ir para perfil do usuário (futura implementação)
      console.log("Navigate to user profile:", item.user_id);
    } else if (type === "book") {
      // Ir para página do livro ou abrir detalhes
      console.log("Navigate to book:", item.id);
    } else if (type === "club") {
      navigate("/clubes");
    }
    setIsOpen(false);
    setQuery("");
  };

  const clearSearch = () => {
    setQuery("");
    setResults({ users: [], books: [], clubs: [] });
    setIsOpen(false);
  };

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults =
    results.users.length > 0 ||
    results.books.length > 0 ||
    results.clubs.length > 0;

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar usuários, livros, clubes..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={clearSearch}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Resultados */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          ) : hasResults ? (
            <div className="py-2">
              {/* Usuários */}
              {results.users.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-sm font-medium text-muted-foreground bg-muted/50">
                    <Users className="h-4 w-4 inline mr-2" />
                    Usuários
                  </div>
                  {results.users.map((user) => (
                    <button
                      key={user.user_id}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center gap-3"
                      onClick={() => handleResultClick("user", user)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {user.display_name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">
                          {user.display_name}
                        </div>
                        {user.bio && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {user.bio}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Livros */}
              {results.books.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-sm font-medium text-muted-foreground bg-muted/50">
                    <BookOpen className="h-4 w-4 inline mr-2" />
                    Livros
                  </div>
                  {results.books.map((book) => (
                    <button
                      key={book.id}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center gap-3"
                      onClick={() => handleResultClick("book", book)}
                    >
                      {book.cover_url ? (
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="w-8 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-8 h-10 bg-muted rounded flex items-center justify-center">
                          <BookOpen className="h-4 w-4" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm line-clamp-1">
                          {book.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {book.author}
                        </div>
                        {book.genre && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {book.genre}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Clubes */}
              {results.clubs.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-sm font-medium text-muted-foreground bg-muted/50">
                    <Users className="h-4 w-4 inline mr-2" />
                    Clubes de Leitura
                  </div>
                  {results.clubs.map((club) => (
                    <button
                      key={club.id}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center gap-3"
                      onClick={() => handleResultClick("club", club)}
                    >
                      {club.cover_image ? (
                        <img
                          src={club.cover_image}
                          alt={club.name}
                          className="w-8 h-8 object-cover rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                          <Users className="h-4 w-4" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-sm">{club.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {club.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado para "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
