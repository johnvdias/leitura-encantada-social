import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { BookPlus, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AddManualBookDialogProps {
  onBookAdded: () => void;
}

export function AddManualBookDialog({ onBookAdded }: AddManualBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [bookData, setBookData] = useState({
    title: "",
    author: "",
    isbn: "",
    pages: "",
    chapters: "",
    genre: "",
    description: "",
    cover_url: "",
    reading_status: "want_to_read" as "reading" | "completed" | "want_to_read",
  });

  const genres = [
    "Ficção",
    "Romance",
    "Mistério",
    "Fantasia",
    "Ficção Científica",
    "Biografia",
    "História",
    "Autoajuda",
    "Negócios",
    "Filosofia",
    "Psicologia",
    "Religião",
    "Ciência",
    "Educação",
    "Infantil",
    "Jovem Adulto",
    "Poesia",
    "Drama",
    "Comédia",
    "Aventura",
    "Terror",
    "Suspense",
    "Outros",
  ];

  const resetForm = () => {
    setBookData({
      title: "",
      author: "",
      isbn: "",
      pages: "",
      chapters: "",
      genre: "",
      description: "",
      cover_url: "",
      reading_status: "want_to_read",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bookData.title || !bookData.author) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("books").insert({
        title: bookData.title.trim(),
        author: bookData.author.trim(),
        isbn: bookData.isbn.trim() || null,
        pages: bookData.pages ? parseInt(bookData.pages) : null,
        chapters: bookData.chapters ? parseInt(bookData.chapters) : null,
        genre: bookData.genre || "Outros",
        description: bookData.description.trim() || "",
        cover_url: bookData.cover_url.trim() || null,
        reading_status: bookData.reading_status,
        reading_progress: 0,
        user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Livro adicionado! 📚",
        description: `"${bookData.title}" foi adicionado à sua estante`,
      });

      resetForm();
      setOpen(false);
      onBookAdded();
    } catch (error) {
      console.error("Error adding manual book:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o livro",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <BookPlus className="h-4 w-4" />
          Adicionar Manualmente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookPlus className="h-5 w-5" />
            Adicionar Livro Manualmente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <h3 className="font-semibold text-lg">Informações Básicas</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={bookData.title}
                    onChange={(e) =>
                      setBookData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Nome do livro"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Autor *</Label>
                  <Input
                    id="author"
                    value={bookData.author}
                    onChange={(e) =>
                      setBookData((prev) => ({
                        ...prev,
                        author: e.target.value,
                      }))
                    }
                    placeholder="Nome do autor"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input
                    id="isbn"
                    value={bookData.isbn}
                    onChange={(e) =>
                      setBookData((prev) => ({ ...prev, isbn: e.target.value }))
                    }
                    placeholder="978-85-00000-00-0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pages">Páginas</Label>
                  <Input
                    id="pages"
                    type="number"
                    value={bookData.pages}
                    onChange={(e) =>
                      setBookData((prev) => ({
                        ...prev,
                        pages: e.target.value,
                      }))
                    }
                    placeholder="300"
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chapters">Capítulos</Label>
                  <Input
                    id="chapters"
                    type="number"
                    value={bookData.chapters}
                    onChange={(e) =>
                      setBookData((prev) => ({
                        ...prev,
                        chapters: e.target.value,
                      }))
                    }
                    placeholder="12"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="genre">Gênero</Label>
                  <Select
                    value={bookData.genre}
                    onValueChange={(value) =>
                      setBookData((prev) => ({ ...prev, genre: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                    <SelectContent>
                      {genres.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status de Leitura</Label>
                  <Select
                    value={bookData.reading_status}
                    onValueChange={(
                      value: "reading" | "completed" | "want_to_read",
                    ) =>
                      setBookData((prev) => ({
                        ...prev,
                        reading_status: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="want_to_read">Quero Ler</SelectItem>
                      <SelectItem value="reading">Lendo</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Descrição e Capa */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <h3 className="font-semibold text-lg">Detalhes Adicionais</h3>

              <div className="space-y-2">
                <Label htmlFor="description">Sinopse/Descrição</Label>
                <Textarea
                  id="description"
                  value={bookData.description}
                  onChange={(e) =>
                    setBookData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Descrição do livro, sinopse..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover_url">URL da Capa</Label>
                <Input
                  id="cover_url"
                  value={bookData.cover_url}
                  onChange={(e) =>
                    setBookData((prev) => ({
                      ...prev,
                      cover_url: e.target.value,
                    }))
                  }
                  placeholder="https://exemplo.com/capa-do-livro.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Cole o link de uma imagem da capa do livro
                </p>
              </div>

              {/* Preview da capa */}
              {bookData.cover_url && (
                <div className="flex justify-center">
                  <div className="w-32 h-40 border rounded overflow-hidden">
                    <img
                      src={bookData.cover_url}
                      alt="Preview da capa"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !bookData.title || !bookData.author}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <BookPlus className="mr-2 h-4 w-4" />
                  Adicionar Livro
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
