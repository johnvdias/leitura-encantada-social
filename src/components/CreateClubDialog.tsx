
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CreateClubDialogProps {
  onClubCreated: () => void;
}

export function CreateClubDialog({ onClubCreated }: CreateClubDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxMembers, setMaxMembers] = useState(50);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('clubs')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          is_private: isPrivate,
          max_members: maxMembers,
          creator_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Clube criado! 🎉",
        description: `O clube "${name}" foi criado com sucesso`
      });

      setOpen(false);
      setName("");
      setDescription("");
      setIsPrivate(false);
      setMaxMembers(50);
      onClubCreated();
    } catch (error) {
      console.error('Error creating club:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o clube",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Criar Clube
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Clube de Leitura</DialogTitle>
          <DialogDescription>
            Preencha as informações abaixo para criar uma nova comunidade literária.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Clube</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Clube dos Mistérios"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o foco do seu clube de leitura..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Clube Privado</Label>
              <p className="text-sm text-muted-foreground">
                Apenas por convite
              </p>
            </div>
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxMembers">Máximo de Membros</Label>
            <Input
              id="maxMembers"
              type="number"
              min={2}
              max={1000}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1"
            >
              {loading ? "Criando..." : "Criar Clube"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
