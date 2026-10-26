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
import { Calendar as CalendarIcon, Loader2, FileText, ListOrdered } from "lucide-react";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type GoalUnit = "pages" | "chapters";

interface Book {
  id: string;
  title: string;
  pages?: number | null;
}

interface CreateClubScheduleDialogProps {
  clubId: string;
  currentBook: Book | null | undefined;
  onScheduleCreated: () => void;
}

const UNIT_LABEL: Record<GoalUnit, string> = {
  pages: "páginas",
  chapters: "capítulos",
};

export function CreateClubScheduleDialog({ clubId, currentBook, onScheduleCreated }: CreateClubScheduleDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState<GoalUnit>("pages");
  const [total, setTotal] = useState("");
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [endDate, setEndDate] = useState(startOfDay(new Date(new Date().setDate(new Date().getDate() + 7))));

  // Reabre o formulário limpo a cada vez, pré-preenchendo a quantidade de
  // páginas com o total do livro quando ele já tem essa informação.
  useEffect(() => {
    if (!open) return;
    setUnit("pages");
    setTotal(currentBook?.pages ? String(currentBook.pages) : "");
    setStartDate(startOfDay(new Date()));
    setEndDate(startOfDay(new Date(new Date().setDate(new Date().getDate() + 7))));
  }, [open, currentBook]);

  if (!currentBook) {
    return (
      <Button disabled>
        <CalendarIcon className="h-4 w-4 mr-2" />
        Defina um livro atual para criar cronogramas
      </Button>
    );
  }

  const totalQuantity = parseInt(total, 10) || 0;
  const totalDays = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
  const dailyTarget = totalQuantity > 0 ? Math.ceil(totalQuantity / totalDays) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (totalQuantity <= 0) {
      toast({ title: "Campo obrigatório", description: `Informe a quantidade total de ${UNIT_LABEL[unit]}.`, variant: "destructive" });
      return;
    }
    if (endDate < startDate) {
      toast({ title: "Datas inválidas", description: "A data de término precisa ser depois da data de início.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // 1. Create the schedule
      const { data: schedule, error: scheduleError } = await supabase
        .from('club_reading_schedules')
        .insert({
          name: `Cronograma: ${currentBook.title}`,
          club_id: clubId,
          book_id: currentBook.id,
          reading_goal: { unit, total: totalQuantity, daily_target: dailyTarget },
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
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
        club_schedule_id: schedule.id,
        user_id: member.user_id,
        progress: 0
      }));

      const { error: participantsError } = await supabase
        .from('club_schedule_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      toast({
        title: "Cronograma do Clube Criado! 🗓️",
        description: `Meta diária: ${dailyTarget} ${UNIT_LABEL[unit]}/dia até ${format(endDate, "dd/MM", { locale: ptBR })}.`,
      });
      setOpen(false);
      onScheduleCreated();

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
            Defina a meta de leitura para o livro <span className="font-bold">{currentBook.title}</span>. O app calcula a meta diária e todos os membros serão notificados.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>O cronograma vai ser contado em</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUnit("pages")}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors",
                  unit === "pages" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                )}
              >
                <FileText className="h-5 w-5" />
                Páginas
              </button>
              <button
                type="button"
                onClick={() => setUnit("chapters")}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors",
                  unit === "chapters" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                )}
              >
                <ListOrdered className="h-5 w-5" />
                Capítulos
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total">Total de {UNIT_LABEL[unit]}</Label>
            <Input
              id="total"
              type="number"
              min={1}
              placeholder={unit === "pages" ? "Ex: 320" : "Ex: 24"}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Data de início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "dd/MM/yy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(startOfDay(date))}
                    disabled={(date) => date < startOfDay(new Date())}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data de término</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "dd/MM/yy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(startOfDay(date))}
                    disabled={(date) => date < startDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {totalQuantity > 0 && (
            <p className="text-sm text-muted-foreground text-center bg-muted rounded-md py-2">
              Meta diária calculada: <span className="font-semibold text-foreground">{dailyTarget} {UNIT_LABEL[unit]}/dia</span> ({totalDays} {totalDays === 1 ? 'dia' : 'dias'})
            </p>
          )}

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
