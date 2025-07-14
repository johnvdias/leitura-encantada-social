import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  BookOpen,
  Users,
  Lock,
  Globe,
  Edit3,
  Trash2,
  Heart,
  Share2,
  Copy,
  Search,
  Filter,
  Star,
  Eye,
  ListTodo,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BookList {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_public: boolean;
  cover_url?: string;
  created_at: string;
  user?: {
    username: string;
    avatar_url?: string;
  };
  books_count?: number;
  books?: any[];
}

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
  genre: string;
  pages?: number;
}

export function BookLists() {
  const [lists, setLists] = useState<BookList[]>([]);
  const [userLists, setUserLists] = useState<BookList[]>([]);
  const [publicLists, setPublicLists] = useState<BookList[]>([]);
  const [selectedList, setSelectedList] = useState<BookList | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<
    "my_lists" | "public_lists" | "list_detail"
  >("my_lists");
  const [newList, setNewList] = useState({
    name: "",
    description: "",
    is_public: false,
    cover_url: "",
  });
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserLists();
    fetchPublicLists();
  }, [user]);

  const fetchUserLists = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("book_lists")
        .select(
          `
          *,
          book_list_items (count)
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const listsWithCount =
        data?.map((list) => ({
          ...list,
          books_count: list.book_list_items?.[0]?.count || 0,
        })) || [];

      setUserLists(listsWithCount);
    } catch (error) {
      console.error("Error fetching user lists:", error);
    }
  };

  const fetchPublicLists = async () => {
    try {
      const { data, error } = await supabase
        .from("book_lists")
        .select(
          `
          *,
          profiles:user_id (username, avatar_url),
          book_list_items (count)
        `,
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const listsWithCount =
        data?.map((list) => ({
          ...list,
          user: list.profiles || { username: "Usuário" },
          books_count: list.book_list_items?.[0]?.count || 0,
        })) || [];

      setPublicLists(listsWithCount);
    } catch (error) {
      console.error("Error fetching public lists:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchListDetails = async (listId: string) => {
    try {
      const { data: listData, error: listError } = await supabase
        .from("book_lists")
        .select(
          `
          *,
          profiles:user_id (username, avatar_url)
        `,
        )
        .eq("id", listId)
        .single();

      if (listError) throw listError;

      const { data: booksData, error: booksError } = await supabase
        .from("book_list_items")
        .select(
          `
          *,
          books:book_id (*)
        `,
        )
        .eq("list_id", listId)
        .order("added_at", { ascending: false });

      if (booksError) throw booksError;

      const listWithBooks = {
        ...listData,
        user: listData.profiles || { username: "Usuário" },
        books: booksData?.map((item) => item.books) || [],
      };

      setSelectedList(listWithBooks);
      setViewMode("list_detail");
    } catch (error) {
      console.error("Error fetching list details:", error);
      toast({
        title: "Erro ao carregar lista",
        description: "Não foi possível carregar os detalhes da lista.",
        variant: "destructive",
      });
    }
  };

  const createList = async () => {
    if (!user || !newList.name.trim()) return;

    try {
      const { data, error } = await supabase
        .from("book_lists")
        .insert({
          user_id: user.id,
          name: newList.name,
          description: newList.description,
          is_public: newList.is_public,
          cover_url: newList.cover_url || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Lista criada!",
        description: `A lista "${newList.name}" foi criada com sucesso.`,
      });

      setIsCreating(false);
      setNewList({
        name: "",
        description: "",
        is_public: false,
        cover_url: "",
      });

      fetchUserLists();
      if (newList.is_public) {
        fetchPublicLists();
      }
    } catch (error) {
      console.error("Error creating list:", error);
      toast({
        title: "Erro ao criar lista",
        description: "Não foi possível criar a lista.",
        variant: "destructive",
      });
    }
  };

  const deleteList = async (listId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("book_lists")
        .delete()
        .eq("id", listId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Lista excluída",
        description: "A lista foi excluída com sucesso.",
      });

      fetchUserLists();
      if (selectedList?.id === listId) {
        setSelectedList(null);
        setViewMode("my_lists");
      }
    } catch (error) {
      console.error("Error deleting list:", error);
      toast({
        title: "Erro ao excluir lista",
        description: "Não foi possível excluir a lista.",
        variant: "destructive",
      });
    }
  };

  const addBookToList = async (listId: string, bookId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("book_list_items").insert({
        list_id: listId,
        book_id: bookId,
      });

      if (error) throw error;

      toast({
        title: "Livro adicionado à lista",
        description: "O livro foi adicionado com sucesso.",
      });

      // Refresh list details if viewing
      if (selectedList?.id === listId) {
        fetchListDetails(listId);
      }
    } catch (error) {
      console.error("Error adding book to list:", error);
      toast({
        title: "Erro ao adicionar livro",
        description: "Não foi possível adicionar o livro à lista.",
        variant: "destructive",
      });
    }
  };

  const removeBookFromList = async (listId: string, bookId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("book_list_items")
        .delete()
        .eq("list_id", listId)
        .eq("book_id", bookId);

      if (error) throw error;

      toast({
        title: "Livro removido da lista",
        description: "O livro foi removido com sucesso.",
      });

      // Refresh list details
      if (selectedList?.id === listId) {
        fetchListDetails(listId);
      }
    } catch (error) {
      console.error("Error removing book from list:", error);
      toast({
        title: "Erro ao remover livro",
        description: "Não foi possível remover o livro da lista.",
        variant: "destructive",
      });
    }
  };

  const copyList = async (originalList: BookList) => {
    if (!user) return;

    try {
      const { data: newListData, error: listError } = await supabase
        .from("book_lists")
        .insert({
          user_id: user.id,
          name: `${originalList.name} (Cópia)`,
          description: originalList.description,
          is_public: false,
        })
        .select()
        .single();

      if (listError) throw listError;

      // Copy all books from original list
      if (originalList.books && originalList.books.length > 0) {
        const bookItems = originalList.books.map((book) => ({
          list_id: newListData.id,
          book_id: book.id,
        }));

        const { error: itemsError } = await supabase
          .from("book_list_items")
          .insert(bookItems);

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Lista copiada!",
        description: "A lista foi copiada para sua biblioteca.",
      });

      fetchUserLists();
    } catch (error) {
      console.error("Error copying list:", error);
      toast({
        title: "Erro ao copiar lista",
        description: "Não foi possível copiar a lista.",
        variant: "destructive",
      });
    }
  };

  const filteredLists = (lists: BookList[]) => {
    if (!searchTerm) return lists;
    return lists.filter(
      (list) =>
        list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        list.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // List Detail View
  if (viewMode === "list_detail" && selectedList) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedList(null);
                  setViewMode("my_lists");
                }}
              >
                ← Voltar
              </Button>

              <div className="flex gap-2">
                {selectedList.user_id !== user?.id && (
                  <Button
                    variant="outline"
                    onClick={() => copyList(selectedList)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Lista
                  </Button>
                )}
                <Button variant="outline">
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-4">
              {selectedList.cover_url ? (
                <img
                  src={selectedList.cover_url}
                  alt={selectedList.name}
                  className="w-20 h-20 object-cover rounded"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                  <ListTodo className="h-8 w-8 text-gray-400" />
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold">{selectedList.name}</h1>
                  {selectedList.is_public ? (
                    <Globe className="h-5 w-5 text-green-500" />
                  ) : (
                    <Lock className="h-5 w-5 text-gray-500" />
                  )}
                </div>

                {selectedList.description && (
                  <p className="text-gray-600 mb-3">
                    {selectedList.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={selectedList.user?.avatar_url} />
                      <AvatarFallback>
                        {selectedList.user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{selectedList.user?.username}</span>
                  </div>
                  <span>{selectedList.books?.length || 0} livros</span>
                  <span>
                    {new Date(selectedList.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {selectedList.books && selectedList.books.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {selectedList.books.map((book, index) => (
                  <Card
                    key={index}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-12 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                            {book.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            {book.author}
                          </p>

                          {selectedList.user_id === user?.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                removeBookFromList(selectedList.id, book.id)
                              }
                              className="text-xs h-6"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Lista vazia</h3>
                <p className="text-muted-foreground">
                  {selectedList.user_id === user?.id
                    ? "Adicione livros para começar sua lista."
                    : "Esta lista ainda não possui livros."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Listas de Livros
            </div>
            <div className="flex gap-2">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as any)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="my_lists">Minhas Listas</option>
                <option value="public_lists">Listas Públicas</option>
              </select>
              {viewMode === "my_lists" && (
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Lista
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Buscar listas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Lists Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLists(
              viewMode === "my_lists" ? userLists : publicLists,
            ).map((list) => (
              <Card
                key={list.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <CardContent
                  className="p-4"
                  onClick={() => fetchListDetails(list.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm line-clamp-1">
                          {list.name}
                        </h3>
                        {list.is_public ? (
                          <Globe className="h-4 w-4 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 text-gray-500" />
                        )}
                      </div>

                      {list.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {list.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {viewMode === "public_lists" && list.user && (
                          <div className="flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={list.user.avatar_url} />
                              <AvatarFallback>
                                {list.user.username?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{list.user.username}</span>
                          </div>
                        )}
                        <span>{list.books_count} livros</span>
                      </div>
                    </div>

                    {viewMode === "my_lists" && (
                      <div
                        className="flex gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteList(list.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {new Date(list.created_at).toLocaleDateString()}
                    </Badge>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      Ver detalhes
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredLists(viewMode === "my_lists" ? userLists : publicLists)
            .length === 0 && (
            <div className="text-center py-8">
              <ListTodo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm
                  ? "Nenhuma lista encontrada"
                  : viewMode === "my_lists"
                    ? "Você ainda não criou listas"
                    : "Nenhuma lista pública disponível"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Tente ajustar os termos de busca."
                  : viewMode === "my_lists"
                    ? "Crie sua primeira lista para organizar seus livros!"
                    : "Seja o primeiro a criar uma lista pública!"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create List Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Lista</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Nome da Lista
              </label>
              <Input
                value={newList.name}
                onChange={(e) =>
                  setNewList((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ex: Livros para o Verão"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Descrição (opcional)
              </label>
              <Textarea
                value={newList.description}
                onChange={(e) =>
                  setNewList((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Descreva sua lista..."
                className="min-h-20"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                URL da Capa (opcional)
              </label>
              <Input
                value={newList.cover_url}
                onChange={(e) =>
                  setNewList((prev) => ({ ...prev, cover_url: e.target.value }))
                }
                placeholder="https://exemplo.com/capa.jpg"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="public"
                checked={newList.is_public}
                onChange={(e) =>
                  setNewList((prev) => ({
                    ...prev,
                    is_public: e.target.checked,
                  }))
                }
              />
              <label htmlFor="public" className="text-sm">
                Tornar lista pública
              </label>
            </div>

            <div className="flex gap-2">
              <Button onClick={createList} disabled={!newList.name.trim()}>
                Criar Lista
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setNewList({
                    name: "",
                    description: "",
                    is_public: false,
                    cover_url: "",
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
