import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Loader2 } from "lucide-react";
import { TablesInsert } from "@/integrations/supabase/types";

interface ManualBookDialogProps {
  onBookAdded: () => void;
}

type ReadingStatus = "reading" | "completed" | "want_to_read";

export function ManualBookDialog({ onBookAdded }: ManualBookDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    pages: 0,
    cover_url: "",
    reading_status: "want_to_read" as ReadingStatus,
  });
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const handleCoverUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, cover_url: e.target.value });
    setCoverPreview(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title || !formData.author || formData.pages <= 0) {
      toast({
        title: "Campos obrigatórios",
        description:
          "Por favor, preencha o título, autor e o número de páginas.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const newBook: TablesInsert<"books"> = {
        user_id: user.id,
        title: formData.title,
        author: formData.author,
        pages: formData.pages,
        cover_url: formData.cover_url || null,
        reading_status: formData.reading_status,
      };

      const { error } = await supabase.from("books").insert(newBook);

      if (error) throw error;

      toast({
        title: "Livro Adicionado! 📚",
        description: `"${formData.title}" foi adicionado à sua estante.`,
      });

      setOpen(false);
      onBookAdded(); // Callback to refresh the book list
      // Reset form
      setFormData({
        title: "",
        author: "",
        pages: 0,
        cover_url: "",
        reading_status: "want_to_read",
      });
      setCoverPreview(null);
    } catch (error) {
      console.error("Error adding book manually:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o livro.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Manualmente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Livro Manualmente</DialogTitle>
          <DialogDescription>
            Preencha os detalhes do livro que você deseja adicionar à sua
            estante.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="author">Autor</Label>
            <Input
              id="author"
              value={formData.author}
              onChange={(e) =>
                setFormData({ ...formData, author: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pages">Número de Páginas</Label>
            <Input
              id="pages"
              type="number"
              min="1"
              value={formData.pages === 0 ? "" : formData.pages}
              onChange={(e) =>
                setFormData({ ...formData, pages: parseInt(e.target.value) || 0 })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status da Leitura</Label>
            <Select
              value={formData.reading_status}
              onValueChange={(value: ReadingStatus) =>
                setFormData({ ...formData, reading_status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="want_to_read">Quero Ler</SelectItem>
                <SelectItem value="reading">Lendo</SelectItem>
                <SelectItem value="completed">Lido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover_url">URL da Capa (Opcional)</Label>
            <Input
              id="cover_url"
              value={formData.cover_url}
              onChange={handleCoverUrlChange}
              placeholder="https://exemplo.com/capa.jpg"
            />
          </div>
          {coverPreview && (
            <div className="flex justify-center">
              <img
                src={coverPreview}
                alt="Pré-visualização da capa"
                className="h-48 w-32 object-cover rounded-md border"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar Livro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
