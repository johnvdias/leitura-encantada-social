import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Quote,
  StickyNote,
  Bookmark,
  Heart,
  Share2,
  Copy,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  Search,
  Filter,
  BookMarked,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Quote {
  id: string;
  user_id: string;
  quote_text: string;
  page_number?: number;
  chapter?: string;
  notes?: string;
  is_public: boolean;
  likes_count: number;
  created_at: string;
  user?: {
    username: string;
    avatar_url?: string;
  };
}

interface Annotation {
  id: string;
  user_id: string;
  annotation_text: string;
  page_number?: number;
  chapter?: string;
  annotation_type: "note" | "highlight" | "bookmark";
  created_at: string;
}

interface QuotesAndNotesProps {
  bookId: string;
  bookTitle: string;
}

export function QuotesAndNotes({ bookId, bookTitle }: QuotesAndNotesProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [userQuotes, setUserQuotes] = useState<Quote[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isAddingQuote, setIsAddingQuote] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newQuote, setNewQuote] = useState({
    text: "",
    page: "",
    chapter: "",
    notes: "",
    isPublic: true,
  });
  const [newAnnotation, setNewAnnotation] = useState({
    text: "",
    page: "",
    chapter: "",
    type: "note" as "note" | "highlight" | "bookmark",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "note" | "highlight" | "bookmark"
  >("all");
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchQuotes();
    fetchUserQuotes();
    fetchAnnotations();
  }, [bookId]);

  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select(
          `
          *,
          profiles:user_id (username, avatar_url)
        `,
        )
        .eq("book_id", bookId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const processedQuotes =
        data?.map((quote) => ({
          ...quote,
          user: quote.profiles || { username: "Usuário" },
        })) || [];

      setQuotes(processedQuotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
    }
  };

  const fetchUserQuotes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("book_id", bookId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserQuotes(data || []);
    } catch (error) {
      console.error("Error fetching user quotes:", error);
    }
  };

  const fetchAnnotations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("annotations")
        .select("*")
        .eq("book_id", bookId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnotations(data || []);
    } catch (error) {
      console.error("Error fetching annotations:", error);
    } finally {
      setLoading(false);
    }
  };

  const addQuote = async () => {
    if (!user || !newQuote.text.trim()) return;

    try {
      const quoteData = {
        user_id: user.id,
        book_id: bookId,
        quote_text: newQuote.text,
        page_number: newQuote.page ? parseInt(newQuote.page) : null,
        chapter: newQuote.chapter || null,
        notes: newQuote.notes || null,
        is_public: newQuote.isPublic,
      };

      const { error } = await supabase.from("quotes").insert(quoteData);

      if (error) throw error;

      // Create activity if public
      if (newQuote.isPublic) {
        await supabase.from("activities").insert({
          user_id: user.id,
          activity_type: "quote_shared",
          related_id: bookId,
          content: `Compartilhou uma citação de "${bookTitle}"`,
          metadata: {
            book_title: bookTitle,
            quote_preview: newQuote.text.substring(0, 100) + "...",
          },
        });
      }

      toast({
        title: "Citação salva!",
        description: "Sua citação foi salva com sucesso.",
      });

      setIsAddingQuote(false);
      setNewQuote({
        text: "",
        page: "",
        chapter: "",
        notes: "",
        isPublic: true,
      });

      fetchQuotes();
      fetchUserQuotes();
    } catch (error) {
      console.error("Error adding quote:", error);
      toast({
        title: "Erro ao salvar citação",
        description: "Não foi possível salvar a citação.",
        variant: "destructive",
      });
    }
  };

  const addAnnotation = async () => {
    if (!user || !newAnnotation.text.trim()) return;

    try {
      const annotationData = {
        user_id: user.id,
        book_id: bookId,
        annotation_text: newAnnotation.text,
        page_number: newAnnotation.page ? parseInt(newAnnotation.page) : null,
        chapter: newAnnotation.chapter || null,
        annotation_type: newAnnotation.type,
      };

      const { error } = await supabase
        .from("annotations")
        .insert(annotationData);

      if (error) throw error;

      toast({
        title: "Anotação salva!",
        description: "Sua anotação foi salva com sucesso.",
      });

      setIsAddingNote(false);
      setNewAnnotation({
        text: "",
        page: "",
        chapter: "",
        type: "note",
      });

      fetchAnnotations();
    } catch (error) {
      console.error("Error adding annotation:", error);
      toast({
        title: "Erro ao salvar anotação",
        description: "Não foi possível salvar a anotação.",
        variant: "destructive",
      });
    }
  };

  const copyQuote = (quote: Quote) => {
    const text = `"${quote.quote_text}"\n\n— ${bookTitle}${quote.page_number ? `, página ${quote.page_number}` : ""}`;
    navigator.clipboard.writeText(text);
    toast({
      title: "Citação copiada!",
      description: "A citação foi copiada para a área de transferência.",
    });
  };

  const filteredAnnotations = annotations.filter((annotation) => {
    const matchesSearch =
      annotation.annotation_text
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (annotation.chapter &&
        annotation.chapter.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter =
      filterType === "all" || annotation.annotation_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getAnnotationIcon = (type: string) => {
    switch (type) {
      case "highlight":
        return <BookMarked className="h-4 w-4 text-yellow-500" />;
      case "bookmark":
        return <Bookmark className="h-4 w-4 text-blue-500" />;
      default:
        return <StickyNote className="h-4 w-4 text-green-500" />;
    }
  };

  const getAnnotationTypeLabel = (type: string) => {
    switch (type) {
      case "highlight":
        return "Destaque";
      case "bookmark":
        return "Marcador";
      default:
        return "Anotação";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="quotes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <Quote className="h-4 w-4" />
            Citações Públicas
          </TabsTrigger>
          <TabsTrigger value="my-quotes" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Minhas Citações
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Minhas Anotações
          </TabsTrigger>
        </TabsList>

        {/* Public Quotes */}
        <TabsContent value="quotes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Citações da Comunidade</span>
                <Button onClick={() => setIsAddingQuote(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Citação
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quotes.length > 0 ? (
                quotes.map((quote) => (
                  <Card key={quote.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={quote.user?.avatar_url} />
                          <AvatarFallback>
                            {quote.user?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm">
                              {quote.user?.username}
                            </span>
                            {quote.page_number && (
                              <Badge variant="outline" className="text-xs">
                                Página {quote.page_number}
                              </Badge>
                            )}
                            {quote.chapter && (
                              <Badge variant="outline" className="text-xs">
                                {quote.chapter}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(quote.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <blockquote className="border-l-2 border-gray-300 pl-4 italic text-gray-700 mb-3">
                            "{quote.quote_text}"
                          </blockquote>

                          {quote.notes && (
                            <p className="text-sm text-gray-600 mb-3">
                              {quote.notes}
                            </p>
                          )}

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyQuote(quote)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copiar
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Heart className="h-4 w-4 mr-1" />
                              {quote.likes_count}
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Share2 className="h-4 w-4 mr-1" />
                              Compartilhar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <Quote className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    Nenhuma citação ainda
                  </h3>
                  <p className="text-muted-foreground">
                    Seja o primeiro a compartilhar uma citação deste livro!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User's Quotes */}
        <TabsContent value="my-quotes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Minhas Citações</span>
                <Button onClick={() => setIsAddingQuote(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Citação
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {userQuotes.length > 0 ? (
                userQuotes.map((quote) => (
                  <Card
                    key={quote.id}
                    className="border-l-4 border-l-green-500"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {quote.page_number && (
                              <Badge variant="outline" className="text-xs">
                                Página {quote.page_number}
                              </Badge>
                            )}
                            {quote.chapter && (
                              <Badge variant="outline" className="text-xs">
                                {quote.chapter}
                              </Badge>
                            )}
                            <div className="flex items-center gap-1">
                              {quote.is_public ? (
                                <Eye className="h-3 w-3 text-green-500" />
                              ) : (
                                <EyeOff className="h-3 w-3 text-gray-500" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {quote.is_public ? "Pública" : "Privada"}
                              </span>
                            </div>
                          </div>

                          <blockquote className="border-l-2 border-gray-300 pl-4 italic text-gray-700 mb-3">
                            "{quote.quote_text}"
                          </blockquote>

                          {quote.notes && (
                            <p className="text-sm text-gray-600 mb-3">
                              {quote.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyQuote(quote)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <Quote className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    Você ainda não salvou citações
                  </h3>
                  <p className="text-muted-foreground">
                    Salve suas passagens favoritas para revisar depois!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Annotations */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Minhas Anotações</span>
                <Button onClick={() => setIsAddingNote(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Anotação
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Buscar anotações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">Todos os tipos</option>
                  <option value="note">Anotações</option>
                  <option value="highlight">Destaques</option>
                  <option value="bookmark">Marcadores</option>
                </select>
              </div>

              {filteredAnnotations.length > 0 ? (
                filteredAnnotations.map((annotation) => (
                  <Card key={annotation.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getAnnotationIcon(annotation.annotation_type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {getAnnotationTypeLabel(
                                annotation.annotation_type,
                              )}
                            </Badge>
                            {annotation.page_number && (
                              <Badge variant="outline" className="text-xs">
                                Página {annotation.page_number}
                              </Badge>
                            )}
                            {annotation.chapter && (
                              <Badge variant="outline" className="text-xs">
                                {annotation.chapter}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                annotation.created_at,
                              ).toLocaleDateString()}
                            </span>
                          </div>

                          <p className="text-sm">
                            {annotation.annotation_text}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <StickyNote className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    Nenhuma anotação encontrada
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm || filterType !== "all"
                      ? "Tente ajustar os filtros de busca."
                      : "Comece fazendo anotações enquanto lê!"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Quote Form */}
      {isAddingQuote && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Citação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Citação</label>
              <Textarea
                value={newQuote.text}
                onChange={(e) =>
                  setNewQuote((prev) => ({ ...prev, text: e.target.value }))
                }
                placeholder="Digite a citação aqui..."
                className="min-h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Página (opcional)
                </label>
                <Input
                  type="number"
                  value={newQuote.page}
                  onChange={(e) =>
                    setNewQuote((prev) => ({ ...prev, page: e.target.value }))
                  }
                  placeholder="Ex: 145"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Capítulo (opcional)
                </label>
                <Input
                  value={newQuote.chapter}
                  onChange={(e) =>
                    setNewQuote((prev) => ({
                      ...prev,
                      chapter: e.target.value,
                    }))
                  }
                  placeholder="Ex: Capítulo 5"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Reflexão (opcional)
              </label>
              <Textarea
                value={newQuote.notes}
                onChange={(e) =>
                  setNewQuote((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Suas reflexões sobre esta citação..."
                className="min-h-20"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="public"
                checked={newQuote.isPublic}
                onChange={(e) =>
                  setNewQuote((prev) => ({
                    ...prev,
                    isPublic: e.target.checked,
                  }))
                }
              />
              <label htmlFor="public" className="text-sm">
                Tornar pública
              </label>
            </div>

            <div className="flex gap-2">
              <Button onClick={addQuote} disabled={!newQuote.text.trim()}>
                Salvar Citação
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingQuote(false);
                  setNewQuote({
                    text: "",
                    page: "",
                    chapter: "",
                    notes: "",
                    isPublic: true,
                  });
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Annotation Form */}
      {isAddingNote && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Anotação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Tipo de anotação
              </label>
              <select
                value={newAnnotation.type}
                onChange={(e) =>
                  setNewAnnotation((prev) => ({
                    ...prev,
                    type: e.target.value as any,
                  }))
                }
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="note">Anotação</option>
                <option value="highlight">Destaque</option>
                <option value="bookmark">Marcador</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Conteúdo</label>
              <Textarea
                value={newAnnotation.text}
                onChange={(e) =>
                  setNewAnnotation((prev) => ({
                    ...prev,
                    text: e.target.value,
                  }))
                }
                placeholder="Digite sua anotação..."
                className="min-h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Página (opcional)
                </label>
                <Input
                  type="number"
                  value={newAnnotation.page}
                  onChange={(e) =>
                    setNewAnnotation((prev) => ({
                      ...prev,
                      page: e.target.value,
                    }))
                  }
                  placeholder="Ex: 145"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Capítulo (opcional)
                </label>
                <Input
                  value={newAnnotation.chapter}
                  onChange={(e) =>
                    setNewAnnotation((prev) => ({
                      ...prev,
                      chapter: e.target.value,
                    }))
                  }
                  placeholder="Ex: Capítulo 5"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={addAnnotation}
                disabled={!newAnnotation.text.trim()}
              >
                Salvar Anotação
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingNote(false);
                  setNewAnnotation({
                    text: "",
                    page: "",
                    chapter: "",
                    type: "note",
                  });
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
