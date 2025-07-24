import { useState } from "react";
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
import { Calendar as CalendarIcon, Plus, Users, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFriendships } from "@/hooks/useFriendships";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CreateScheduleDialogProps {
  bookId: string;
  bookTitle: string;
}

interface ReadingGoal {
  date: Date;
  target: string;
}

export function CreateScheduleDialog({ bookId, bookTitle }: CreateScheduleDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { friends } = useFriendships();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [goals, setGoals] = useState<ReadingGoal[]>([]);
  const [formData, setFormData] = useState({
    name: `Leitura em grupo de "${bookTitle}"`,
    start_date: new Date(),
    end_date: new Date(new Date().setDate(new Date().getDate() + 30)),
  });

  const handleGoalChange = (index: number, field: keyof ReadingGoal, value: any) => {
    const newGoals = [...goals];
    newGoals[index] = { ...newGoals[index], [field]: value };
    setGoals(newGoals);
  };
  
  const addGoal = () => setGoals([...goals, { date: new Date(), target: '' }]);
  const removeGoal = (index: number) => setGoals(goals.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { data: schedule, error: scheduleError } = await supabase
        .from('group_reading_schedules')
        .insert({
          name: formData.name,
          book_id: bookId,
          creator_id: user.id,
          start_date: formData.start_date.toISOString(),
          end_date: formData.end_date.toISOString(),
          reading_goal: goals.map(g => ({...g, date: g.date.toISOString()})),
        })
        .select()
        .single();
      if (scheduleError) throw scheduleError;
      
      const participantInserts = [
        { schedule_id: schedule.id, user_id: user.id, status: 'accepted', joined_at: new Date().toISOString() },
        ...selectedFriends.map(friendId => ({ schedule_id: schedule.id, user_id: friendId, status: 'invited' }))
      ];
      await supabase.from('schedule_participants').insert(participantInserts);

      toast({ title: "Cronograma criado!", description: "Convites enviados aos seus amigos." });
      setOpen(false);
      window.location.reload();
    } catch (error) {
       toast({ title: "Erro ao criar cronograma", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />Ler com Amigos</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Cronograma de Leitura</DialogTitle>
          <DialogDescription>Para o livro: <span className="font-semibold">{bookTitle}</span></DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Nome do Cronograma</Label>
            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Date pickers for start and end date */}
          </div>
          <div>
            <Label>Metas Intermediárias (Opcional)</Label>
            <div className="space-y-2">
              {goals.map((goal, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild><Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{format(goal.date, "dd/MM")}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={goal.date} onSelect={(d) => d && handleGoalChange(index, 'date', d)} /></PopoverContent>
                  </Popover>
                  <Input placeholder="Ex: Página 150 ou Capítulo 10" value={goal.target} onChange={(e) => handleGoalChange(index, 'target', e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeGoal(index)}><Trash2 className="h-4 w-4"/></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addGoal}><Plus className="mr-2 h-4 w-4"/>Adicionar Meta</Button>
            </div>
          </div>
          <div>
            <Label>Convidar Amigos</Label>
            {/* Friend selector */}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar e Convidar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}