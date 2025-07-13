import { useState, useEffect } from "react";
import { Search, BookOpen, Users, Building } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  type: 'book' | 'user' | 'club';
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  description?: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Buscar livros
      const { data: books } = await supabase
        .from('books')
        .select('id, title, author')
        .or(`title.ilike.%${searchQuery}%, author.ilike.%${searchQuery}%`)
        .limit(5);

      if (books) {
        searchResults.push(...books.map(book => ({
          type: 'book' as const,
          id: book.id,
          title: book.title,
          subtitle: `por ${book.author}`,
        })));
      }

      // Buscar usuários
      const { data: users } = await supabase
        .from('profiles')
        .select('id, display_name, bio, avatar_url')
        .ilike('display_name', `%${searchQuery}%`)
        .limit(5);

      if (users) {
        searchResults.push(...users.map(user => ({
          type: 'user' as const,
          id: user.id,
          title: user.display_name || 'Usuário',
          subtitle: user.bio,
          avatar: user.avatar_url,
        })));
      }

      // Buscar clubes
      const { data: clubs } = await supabase
        .from('clubs')
        .select('id, name, description')
        .or(`name.ilike.%${searchQuery}%, description.ilike.%${searchQuery}%`)
        .eq('is_private', false)
        .limit(5);

      if (clubs) {
        searchResults.push(...clubs.map(club => ({
          type: 'club' as const,
          id: club.id,
          title: club.name,
          subtitle: club.description,
        })));
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    
    switch (result.type) {
      case 'book':
        // Navigate to book details or estante
        navigate('/estante');
        break;
      case 'user':
        navigate(`/perfil/${result.id}`);
        break;
      case 'club':
        navigate(`/clube/${result.id}`);
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'book': return BookOpen;
      case 'user': return Users;
      case 'club': return Building;
      default: return Search;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'book': return 'Livro';
      case 'user': return 'Usuário';
      case 'club': return 'Clube';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full md:w-auto">
          <Search className="h-4 w-4 mr-2" />
          Buscar...
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[600px]">
        <DialogHeader>
          <DialogTitle>Busca Global</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar livros, usuários ou clubes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {loading && (
              <div className="text-center py-4 text-muted-foreground">
                Buscando...
              </div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum resultado encontrado</p>
              </div>
            )}

            {results.map((result) => {
              const Icon = getIcon(result.type);
              return (
                <div
                  key={`${result.type}-${result.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleResultClick(result)}
                >
                  {result.type === 'user' && result.avatar ? (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={result.avatar} />
                      <AvatarFallback>
                        {result.title[0]}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{result.title}</p>
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(result.type)}
                      </Badge>
                    </div>
                    {result.subtitle && (
                      <p className="text-sm text-muted-foreground truncate">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {query.length < 2 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Digite pelo menos 2 caracteres para buscar</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}