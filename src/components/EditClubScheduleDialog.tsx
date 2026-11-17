import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { notifyClubMembers } from "@/lib/notifyClubMembers";
import { Calendar as CalendarIcon, Loader2, FileText, ListOrdered } from "lucide-react";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type GoalUnit = "pages" | "chapters";

interface StructuredGoal {
  unit: GoalUnit;
  total: number;
  daily_target: number;
}

const isStructuredGoal = (goal: unknown): goal is StructuredGoal =>
  !!goal && typeof goal === 'object' && 'daily_target' in (goal as Record<string, unknown>);

interface ScheduleToEdit {
  id: string;
  clubId: string;
  bookTitle: string;
  readingGoal: string | StructuredGoal;
  startDate: string;
  endDate: string;
}

const UNIT_LABEL: Record<GoalUnit, string> = {
  pages: "páginas",
  chapters: "capítulos",
};

interface EditClubScheduleDialogProps {
  schedule: ScheduleToEdit | null;
  onOpenChange: (open: boolean) => void;
  onScheduleUpdated: () => void;
}

export function EditClubScheduleDialog({ schedule, onOpenChange, onScheduleUpdated }: EditClubScheduleDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState<GoalUnit>("pages");
  const [total, setTotal] = useState("");
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [endDate, setEndDate] = useState(startOfDay(new Date()));

  // Pré-preenche com os valores atuais do cronograma toda vez que ele muda
  // (abrir a edição de um cronograma diferente, ou reabrir o mesmo).
  useEffect(() => {
    if (!schedule) return;
    if (isStructuredGoal(schedule.readingGoal)) {
      setUnit(schedule.readingGoal.unit);
      setTotal(String(schedule.readingGoal.total));
    } else {
      setUnit("pages");
      setTotal("");
    }
    setStartDate(startOfDay(new Date(schedule.startDate)));
    setEndDate(startOfDay(new Date(schedule.endDate)));
  }, [schedule]);

  if (!schedule) return null;

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
      const { error } = await supabase
        .from('club_reading_schedules')
        .update({
          reading_goal: { unit, total: totalQuantity, daily_target: dailyTarget },
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        })
        .eq('id', schedule.id);

      if (error) throw error;

      notifyClubMembers({
        clubId: schedule.clubId,
        excludeUserId: user.id,
        type: 'club_schedule',
        title: '🗓️ Cronograma do clube atualizado',
        content: `"${schedule.bookTitle}": nova meta de ${dailyTarget} ${UNIT_LABEL[unit]}/dia, de ${format(startDate, "dd/MM", { locale: ptBR })} até ${format(endDate, "dd/MM", { locale: ptBR })}.`,
        relatedId: schedule.clubId,
      }).catch(() => {
        // Notificar é best-effort; o cronograma já foi atualizado.
      });

      toast({
        title: "Cronograma atualizado! 🗓️",
        description: `Meta diária: ${dailyTarget} ${UNIT_LABEL[unit]}/dia até ${format(endDate, "dd/MM", { locale: ptBR })}.`,
      });
      onOpenChange(false);
      onScheduleUpdated();
    } catch (error) {
      console.error('Error updating club schedule:', error);
      toast({ title: "Erro", description: "Não foi possível atualizar o cronograma.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!schedule} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Cronograma do Clube</DialogTitle>
          <DialogDescription>
            Ajuste a meta de leitura para o livro <span className="font-bold">{schedule.bookTitle}</span>. Todos os membros serão avisados da mudança.
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
            <Label htmlFor="edit-total">Total de {UNIT_LABEL[unit]}</Label>
            <Input
              id="edit-total"
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
