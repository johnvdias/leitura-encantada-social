import { useState, useEffect } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Book {
  id: string;
  title: string;
}

interface CreateClubScheduleDialogProps {
  clubId: string;
  currentBook: Book | null | undefined;
  onScheduleCreated: () => void;
}

export function CreateClubScheduleDialog({ clubId, currentBook, onScheduleCreated }: CreateClubScheduleDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    reading_goal: "",
    due_date: new Date(new Date().setDate(new Date().getDate() + 7)),
  });

  if (!currentBook) {
    return (
      <Button disabled>
        <CalendarIcon className="h-4 w-4 mr-2" />
        Defina um livro atual para criar cronogramas
      </Button>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name || !formData.reading_goal) {
        toast({ title: "Campos obrigatórios", description: "Por favor, preencha o nome e a meta do cronograma.", variant: "destructive"});
        return;
    };

    setLoading(true);
    try {
      // 1. Create the schedule
      const { data: schedule, error: scheduleError } = await supabase
        .from('club_reading_schedules')
        .insert({
          name: formData.name,
          club_id: clubId,
          book_id: currentBook.id,
          reading_goal: formData.reading_goal,
          due_date: formData.due_date.toISOString(),
          creator_id: user.id,
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // 2. Automatically enroll all current club members
      const { data: members, error: membersError } = await supabase
        .from('club_members')
        .select('user_id')
        .eq('club_id', clubId);
      
      if (membersError) throw membersError;

      const participants = members.map(member => ({
        schedule_id: schedule.id,
        user_id: member.user_id,
        status: 'accepted' // Auto-accepted for club members
      }));

      const { error: participantsError } = await supabase
        .from('club_schedule_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      toast({
        title: "Cronograma do Clube Criado! 🗓️",
        description: "A nova meta de leitura foi definida para todos os membros.",
      });
      setOpen(false);
      onScheduleCreated();
      setFormData({ name: "", reading_goal: "", due_date: new Date(new Date().setDate(new Date().getDate() + 7)) });

    } catch (error) {
      console.error('Error creating club schedule:', error);
      toast({ title: "Erro", description: "Não foi possível criar o cronograma para o clube.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalendarIcon className="h-4 w-4 mr-2" />
          Novo Cronograma do Clube
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Cronograma para o Clube</DialogTitle>
          <DialogDescription>
            Defina a próxima meta de leitura para o livro <span className="font-bold">{currentBook.title}</span>. Todos os membros serão notificados.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Meta</Label>
            <Input id="name" placeholder="Ex: Meta da Semana 1" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reading_goal">Descrição da Meta</Label>
            <Input id="reading_goal" placeholder="Ex: Ler até a página 50" value={formData.reading_goal} onChange={(e) => setFormData({...formData, reading_goal: e.target.value})} required />
          </div>

          <div className="space-y-2">
            <Label>Data Limite</Label>
            <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.due_date, "PPP", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.due_date} onSelect={(date) => date && setFormData({ ...formData, due_date: date })} /></PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Meta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
