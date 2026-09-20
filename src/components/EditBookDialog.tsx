
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Edit3 } from "lucide-react";

interface EditBookDialogProps {
  bookId: string;
  title: string;
  author: string;
  pages: number | null;
  genre: string;
  description?: string;
  coverUrl?: string | null;
  status: 'reading' | 'completed' | 'want_to_read';
  onBookUpdated: () => void;
  children?: React.ReactNode;
}

export function EditBookDialog({
  bookId,
  title,
  author,
  pages,
  genre,
  description,
  coverUrl,
  status,
  onBookUpdated,
  children,
}: EditBookDialogProps) {
  const [formData, setFormData] = useState({
    title,
    author,
    pages: pages || 0,
    genre,
    description: description || "",
    coverUrl: coverUrl || "",
    status,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleUpdateBook = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("books")
        .update({
          title: formData.title,
          author: formData.author,
          pages: formData.pages > 0 ? formData.pages : null,
          genre: formData.genre,
          description: formData.description || null,
          cover_url: formData.coverUrl || null,
          reading_status: formData.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookId);

      if (error) throw error;

      // Também completa o catálogo compartilhado com o que estava faltando
      // (ex: a capa) - assim a próxima busca (de qualquer usuária) já vem
      // corrigida. Só preenche campos vazios, nunca sobrescreve um dado que
      // já existia (mesmo que esteja errado), pra uma edição não estragar
      // informação que já estava certa pra todo mundo.
      await supabase.rpc('upsert_book_catalog', {
        p_title: formData.title,
        p_authors: formData.author,
        p_page_count: formData.pages > 0 ? formData.pages : null,
        p_genre: formData.genre || null,
        p_description: formData.description || null,
        p_cover_url: formData.coverUrl || null,
        p_source: 'manual',
      });

      toast({
        title: "Livro atualizado!",
        description: "As informações do livro foram atualizadas com sucesso.",
      });

      setOpen(false);
      onBookUpdated();
    } catch (error) {
      console.error("Error updating book:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o livro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="p-2">
            <Edit3 className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Editar Livro
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Título do livro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="author">Autor</Label>
            <Input
              id="author"
              value={formData.author}
              onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
              placeholder="Nome do autor"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pages">Total de Páginas</Label>
              <Input
                id="pages"
                type="number"
                min={0}
                value={formData.pages}
                onChange={(e) => setFormData(prev => ({ ...prev, pages: Number(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'reading' | 'completed' | 'want_to_read') => 
                  setFormData(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="want_to_read">Quero Ler</SelectItem>
                  <SelectItem value="reading">Lendo</SelectItem>
                  <SelectItem value="completed">Lido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover_url">URL da Capa</Label>
            <Input
              id="cover_url"
              value={formData.coverUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, coverUrl: e.target.value }))}
              placeholder="https://exemplo.com/capa.jpg"
            />
            {formData.coverUrl && (
              <div className="flex justify-center pt-1">
                <img
                  src={formData.coverUrl}
                  alt="Pré-visualização da capa"
                  className="h-32 w-20 object-cover rounded-md border"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="genre">Gênero</Label>
            <Input
              id="genre"
              value={formData.genre}
              onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
              placeholder="Gênero do livro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição ou comentários sobre o livro"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateBook}
              disabled={isLoading || !formData.title || !formData.author}
              className="flex-1"
            >
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
