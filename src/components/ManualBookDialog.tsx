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
import { Plus, Upload, Link2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function ManualBookDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
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

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverUrl(""); // Clear URL if a file is selected
      const preview = URL.createObjectURL(file);
      setCoverPreview(preview);
    }
  };

  const handleCoverUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setCoverUrl(url);
    setCoverFile(null); // Clear file if a URL is entered
    setCoverPreview(url);
  };

  const uploadCover = async () => {
    if (!coverFile || !user) return null;

    const fileExt = coverFile.name.split('.').pop();
    const fileName = `${user.id}/book-covers/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('book_covers') // Assuming a 'book_covers' bucket
      .upload(fileName, coverFile);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('book_covers')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      let finalCoverUrl = coverUrl;

      if (coverFile) {
        finalCoverUrl = await uploadCover() || "";
      }

      const { error } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
          title: formData.title,
          author: formData.author,
          description: formData.description,
          page_count: formData.pages ? parseInt(formData.pages) : null,
          genre: formData.genre,
          // reading_status and personal_notes seem to be on a different table (user_books)
          // For now, let's just create the book entry
          cover_url: finalCoverUrl,
        });
        
      if (error) throw error;
      
      // We would likely need to also add an entry to a `user_books` table here
      // linking the user to this new book with a reading_status

      setOpen(false);
      // Reset form state
      setFormData({ title: "", author: "", description: "", pages: "", genre: "", reading_status: "want_to_read", personal_notes: "" });
      setCoverFile(null);
      setCoverUrl("");
      setCoverPreview(null);

      toast({
        title: "Livro adicionado",
        description: "O livro foi adicionado com sucesso.",
      });

      // It's better to refetch data than to reload the whole page
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
            <div className="flex items-center gap-4">
              {coverPreview && (
                <img 
                  src={coverPreview} 
                  alt="Preview da capa" 
                  className="w-24 h-36 object-cover rounded border"
                  onError={(e) => e.currentTarget.src = 'https://via.placeholder.com/150'}
                />
              )}
              <div className="grid gap-3 flex-1">
                <Label>Capa do Livro</Label>
                <Input
                  id="cover-url"
                  placeholder="https://exemplo.com/capa.jpg"
                  value={coverUrl}
                  onChange={handleCoverUrlChange}
                />
                <div className="flex items-center">
                  <span className="flex-1 border-t"></span>
                  <span className="px-2 text-xs text-muted-foreground">OU</span>
                  <span className="flex-1 border-t"></span>
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverFileChange}
                  className="hidden"
                  id="cover-upload"
                />
                <Label htmlFor="cover-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Fazer Upload de Arquivo
                    </span>
                  </Button>
                </Label>
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
              <Label htmlFor="pages">Número de Páginas</Label>
              <Input
                id="pages"
                type="number"
                value={formData.pages}
                onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                placeholder="Ex: 320"
              />
            </div>
            
            {/* The rest of the form for user-specific data can be added back if needed */}
            {/* For now, focusing on adding the book to the main 'books' table */}
            
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