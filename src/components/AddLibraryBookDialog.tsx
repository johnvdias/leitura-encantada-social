import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Upload, Loader2 } from "lucide-react";
import { useLibraryBooks } from "@/hooks/useLibraryBooks";
import { useToast } from "@/hooks/use-toast";

export function AddLibraryBookDialog() {
  const { addBook } = useLibraryBooks();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: "", author: "", description: "", genre: "", cover_url: "" });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && !selected.name.toLowerCase().endsWith('.epub')) {
      toast({ title: 'Formato inválido', description: 'Só arquivos .epub são aceitos.', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setFile(selected || null);
  };

  const resetForm = () => {
    setForm({ title: "", author: "", description: "", genre: "", cover_url: "" });
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!file || !form.title.trim() || !form.author.trim()) return;

    setSaving(true);
    try {
      await addBook(file, form);
      toast({ title: 'Livro adicionado! 📚', description: `"${form.title}" já está na Biblioteca Encantada.` });
      resetForm();
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível adicionar o livro.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isValid = file && form.title.trim() && form.author.trim();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Livro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Adicionar à Biblioteca Encantada</DialogTitle>
          <DialogDescription>Só administradoras podem adicionar livros aqui.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lib-title">Título</Label>
            <Input id="lib-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lib-author">Autora</Label>
            <Input id="lib-author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lib-genre">Gênero (opcional)</Label>
            <Input id="lib-genre" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lib-cover">URL da capa (opcional)</Label>
            <Input id="lib-cover" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lib-description">Descrição (opcional)</Label>
            <Textarea id="lib-description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lib-file">Arquivo EPUB</Label>
            <Input id="lib-file" type="file" accept=".epub" onChange={handleFileChange} />
          </div>

          <Button onClick={handleSubmit} disabled={!isValid || saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
