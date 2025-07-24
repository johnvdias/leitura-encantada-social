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
import { Calendar as CalendarIcon, Plus, Trash2, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CreateClubScheduleDialogProps {
  clubId: string;
}

interface ReadingGoal {
  date: Date;
  target: string;
}

interface BookOption {
  id: string;
  title: string;
  author: string;
}

export function CreateClubScheduleDialog({ clubId }: CreateClubScheduleDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<BookOption[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [goals, setGoals] = useState<ReadingGoal[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    start_date: new Date(),
    end_date: new Date(new Date().setDate(new Date().getDate() + 30)),
  });

  useEffect(() => {
    const fetchClubBooks = async () => {
      // For now, let's fetch all books from the general 'books' table
      // In a real scenario, you might want books already added by members or club-specific books
      const { data, error } = await supabase
        .from('books')
        .select('id, title, author')
        .limit(20); // Limit to avoid fetching too many books

      if (error) {
        console.error("Error fetching books:", error);
        toast({ title: 'Erro ao carregar livros', variant: 'destructive' });
      } else {
        setBooks(data || []);
      }
    };

    if (open) {
      fetchClubBooks();
    }
  }, [open, toast]);

  const handleGoalChange = (index: number, field: keyof ReadingGoal, value: any) => {
    const newGoals = [...goals];
    newGoals[index] = { ...newGoals[index], [field]: value };
    setGoals(newGoals);
  };
  
  const addGoal = () => setGoals([...goals, { date: new Date(), target: '' }]);
  const removeGoal = (index: number) => setGoals(goals.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBookId || !formData.name.trim()) return;

    setLoading(true);
    try {
      const { data: schedule, error: scheduleError } = await supabase
        .from('club_reading_schedules')
        .insert({
          club_id: clubId,
          name: formData.name,
          book_id: selectedBookId,
          creator_id: user.id,
          start_date: formData.start_date.toISOString(),
          end_date: formData.end_date.toISOString(),
          reading_goal: goals.map(g => ({...g, date: g.date.toISOString()})),
        })
        .select()
        .single();
      if (scheduleError) throw scheduleError;
      
      // Add the creator as a participant automatically
      await supabase.from('club_schedule_participants').insert({
        club_schedule_id: schedule.id,
        user_id: user.id,
        progress: 0,
      });

      toast({ title: "Cronograma do clube criado!", description: "Os membros agora podem participar." });
      setOpen(false);
      window.location.reload();
    } catch (error) {
       toast({ title: "Erro ao criar cronograma do clube", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><BookOpen className="mr-2 h-4 w-4"/>Criar Cronograma</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Cronograma de Leitura do Clube</DialogTitle>
          <DialogDescription>Defina um livro, datas e metas de leitura para o clube.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Cronograma</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="book">Livro</Label>
            <Select value={selectedBookId || ''} onValueChange={setSelectedBookId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um livro" />
              </SelectTrigger>
              <SelectContent>
                {books.map(book => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.title} por {book.author}
                  </SelectItem>
                ))}
                {books.length === 0 && <p className="p-2 text-sm text-muted-foreground">Nenhum livro disponível.</p>}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{format(formData.start_date, "PPP", { locale: ptBR })}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.start_date} onSelect={(d) => d && setFormData({...formData, start_date: d})} initialFocus /></PopoverContent>
              </Popover>
            </div>
             <div className="grid gap-2">
              <Label>Data de Término</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{format(formData.end_date, "PPP", { locale: ptBR })}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.end_date} onSelect={(d) => d && setFormData({...formData, end_date: d})} initialFocus /></PopoverContent>
              </Popover>
            </div>
          </div>
          <div>
            <Label>Metas Intermediárias (Opcional)</Label>
            <div className="space-y-2 mt-2">
              {goals.map((goal, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild><Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{format(goal.date, "dd/MM", { locale: ptBR })}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={goal.date} onSelect={(d) => handleGoalChange(index, 'date', d)} /></PopoverContent>
                  </Popover>
                  <Input placeholder="Ex: Página 150 ou Capítulo 10" value={goal.target} onChange={(e) => handleGoalChange(index, 'target', e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeGoal(index)}><Trash2 className="h-4 w-4"/></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addGoal}><Plus className="mr-2 h-4 w-4"/>Adicionar Meta</Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !selectedBookId}>{loading ? "Criando..." : "Criar Cronograma"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}