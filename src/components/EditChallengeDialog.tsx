import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

// Usando a interface Challenge do ChallengesSection para consistência
interface Challenge {
  id: string;
  name: string;
  description: string;
  goal_type: string;
  goal_value: number;
  start_date: string;
  end_date: string;
  book_id: string | null;
}

interface EditChallengeDialogProps {
  challenge: Challenge;
  onChallengeUpdated: () => void;
}

export function EditChallengeDialog({ challenge, onChallengeUpdated }: EditChallengeDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: challenge.name,
    description: challenge.description || "",
    goal_value: challenge.goal_value.toString(),
    start_date: parseISO(challenge.start_date),
    end_date: parseISO(challenge.end_date),
  });

  // Esse diálogo fica montado junto com o card do desafio o tempo todo, não
  // só quando aberto - o useState acima só captura os dados na primeira
  // renderização. Sem recarregar ao abrir, editar e salvar uma vez, fechar
  // e reabrir mostrava os valores originais de novo (não o que acabou de
  // ser salvo), e salvar de novo sem mexer revertia a edição silenciosamente.
  useEffect(() => {
    if (!open) return;
    setFormData({
      name: challenge.name,
      description: challenge.description || "",
      goal_value: challenge.goal_value.toString(),
      start_date: parseISO(challenge.start_date),
      end_date: parseISO(challenge.end_date),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("challenges")
        .update({
          name: formData.name,
          description: formData.description,
          goal_value: parseInt(formData.goal_value),
          start_date: formData.start_date.toISOString(),
          end_date: formData.end_date.toISOString(),
        })
        .eq("id", challenge.id);

      if (error) throw error;

      toast({
        title: "Desafio Atualizado! ✅",
        description: "As informações do desafio foram salvas.",
      });
      setOpen(false);
      onChallengeUpdated(); // Callback para atualizar a lista de desafios
    } catch (error) {
      console.error("Error updating challenge:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o desafio.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Desafio</DialogTitle>
          <DialogDescription>
            Ajuste os detalhes do seu desafio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Desafio</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required disabled={!!challenge.book_id} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>
          
          <div className="grid gap-2">
              <Label htmlFor="goal_value">Valor da Meta</Label>
              <Input id="goal_value" type="number" value={formData.goal_value} onChange={(e) => setFormData({...formData, goal_value: e.target.value})} required disabled={!!challenge.book_id} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.start_date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={formData.start_date} onSelect={(date) => date && setFormData({ ...formData, start_date: date })} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.end_date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={formData.end_date} onSelect={(date) => date && setFormData({ ...formData, end_date: date })} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Atualizando..." : "Salvar Alterações"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
