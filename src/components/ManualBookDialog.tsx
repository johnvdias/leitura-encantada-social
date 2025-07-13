import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function ManualBookDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    pages: "",
    genre: "",
    reading_status: "want_to_read",
    personal_notes: "",
  });

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const preview = URL.createObjectURL(file);
      setCoverPreview(preview);
    }
  };

  const uploadCover = async () => {
    if (!coverFile || !user) return null;

    const fileExt = coverFile.name.split('.').pop();
    const fileName = `${user.id}/book-covers/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, coverFile);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      let cover_url = null;

      if (coverFile) {
        cover_url = await uploadCover();
      }

      const { error } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
          title: formData.title,
          author: formData.author,
          description: formData.description,
          pages: formData.pages ? parseInt(formData.pages) : null,
          genre: formData.genre,
          reading_status: formData.reading_status,
          personal_notes: formData.personal_notes,
          cover_url,
        });

      if (error) throw error;

      setOpen(false);
      setFormData({
        title: "",
        author: "",
        description: "",
        pages: "",
        genre: "",
        reading_status: "want_to_read",
        personal_notes: "",
      });
      setCoverFile(null);
      setCoverPreview(null);

      toast({
        title: "Livro adicionado",
        description: "O livro foi adicionado à sua estante com sucesso.",
      });

      window.location.reload();
    } catch (error) {
      console.error('Error adding book:', error);
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
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Manualmente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Livro Manualmente</DialogTitle>
          <DialogDescription>
            Preencha as informações do livro que você quer adicionar à sua estante.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Capa do Livro</Label>
              <div className="flex items-center gap-4">
                {coverPreview && (
                  <img 
                    src={coverPreview} 
                    alt="Preview da capa" 
                    className="w-20 h-28 object-cover rounded border"
                  />
                )}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="hidden"
                    id="cover-upload"
                  />
                  <Label htmlFor="cover-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {coverPreview ? "Alterar Capa" : "Adicionar Capa"}
                      </span>
                    </Button>
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nome do livro"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="author">Autor</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Nome do autor"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="genre">Gênero</Label>
              <Input
                id="genre"
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                placeholder="Ex: Romance, Ficção, Biografia"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pages">Número de Páginas</Label>
              <Input
                id="pages"
                type="number"
                value={formData.pages}
                onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                placeholder="Ex: 320"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reading_status">Status de Leitura</Label>
              <Select value={formData.reading_status} onValueChange={(value) => setFormData({ ...formData, reading_status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="want_to_read">Quero Ler</SelectItem>
                  <SelectItem value="reading">Lendo</SelectItem>
                  <SelectItem value="completed">Finalizado</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Resumo ou sinopse do livro..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="personal_notes">Notas Pessoais</Label>
              <Textarea
                id="personal_notes"
                value={formData.personal_notes}
                onChange={(e) => setFormData({ ...formData, personal_notes: e.target.value })}
                placeholder="Suas anotações sobre o livro..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adicionando..." : "Adicionar Livro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}