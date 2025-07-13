import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings } from "lucide-react";

interface EditClubDialogProps {
  club: {
    id: string;
    name: string;
    description: string;
    is_private: boolean;
    max_members: number;
  };
  onUpdate: () => void;
}

export function EditClubDialog({ club, onUpdate }: EditClubDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description || "");
  const [isPrivate, setIsPrivate] = useState(club.is_private);
  const [maxMembers, setMaxMembers] = useState(club.max_members);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('clubs')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          is_private: isPrivate,
          max_members: maxMembers
        })
        .eq('id', club.id);

      if (error) throw error;

      toast({
        title: "Clube atualizado",
        description: "As informações do clube foram atualizadas com sucesso"
      });

      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating club:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o clube",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-1" />
          Editar Clube
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Clube</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Clube</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do clube"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o clube de leitura..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxMembers">Máximo de Membros</Label>
            <Input
              id="maxMembers"
              type="number"
              min={1}
              max={1000}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="private">Clube Privado</Label>
            <Switch
              id="private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}