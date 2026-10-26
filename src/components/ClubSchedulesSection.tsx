import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Trash2, Flame, Snowflake, Target } from 'lucide-react';
import { formatDistanceToNow, isPast, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StructuredGoal {
  unit: 'pages' | 'chapters';
  total: number;
  daily_target: number;
}

const UNIT_LABEL: Record<StructuredGoal['unit'], string> = {
  pages: 'páginas',
  chapters: 'capítulos',
};

// Cronogramas criados antes da meta estruturada guardam uma frase livre
// (ex: "Ler até o capítulo 03") no mesmo campo - mantém os dois formatos
// legíveis em vez de quebrar a exibição dos cronogramas antigos.
const isStructuredGoal = (goal: unknown): goal is StructuredGoal =>
  !!goal && typeof goal === 'object' && 'daily_target' in (goal as Record<string, unknown>);

interface Schedule {
  id: string;
  name: string;
  reading_goal: string | StructuredGoal;
  end_date: string;
  current_streak: number;
  freezes_available: number;
  books: {
    title: string;
  };
}

interface ClubSchedulesSectionProps {
  clubId: string;
  isCreator: boolean;
  onSchedulesUpdated: () => void;
}

export function ClubSchedulesSection({ clubId, isCreator }: ClubSchedulesSectionProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('club_reading_schedules')
        .select(`
          id, name, reading_goal, end_date, current_streak, freezes_available,
          books (title)
        `)
        .eq('club_id', clubId)
        .order('end_date', { ascending: false });

      if (error) throw error;
      setSchedules(data as Schedule[]);
    } catch (error) {
      console.error("Error fetching club schedules:", error);
      toast({ title: 'Erro ao buscar cronogramas do clube', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [clubId, toast]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('club_reading_schedules')
        .delete()
        .eq('id', scheduleId);
      
      if (error) throw error;

      toast({ title: "Meta removida", description: "A meta de leitura foi removida."});
      fetchSchedules();

    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível remover a meta.", variant: "destructive" });
    }
  }

  const renderScheduleCard = (schedule: Schedule) => {
    const isOverdue = isPast(new Date(schedule.end_date));

    return (
        <Card key={schedule.id} className={isOverdue ? 'border-dashed' : ''}>
            <CardHeader>
                <CardTitle>{schedule.name}</CardTitle>
                <CardDescription>
                  Meta para: <span className="font-semibold">{schedule.books.title}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isStructuredGoal(schedule.reading_goal) ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Target className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      <span className="font-medium text-foreground">{schedule.reading_goal.daily_target} {UNIT_LABEL[schedule.reading_goal.unit]}/dia</span>
                      {' '}({schedule.reading_goal.total} {UNIT_LABEL[schedule.reading_goal.unit]} no total)
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{schedule.reading_goal}</p>
                )}
            </CardContent>
            <CardFooter className="flex justify-between items-center text-sm">
                 <div className="flex flex-wrap gap-1">
                   <Badge variant={isOverdue ? 'outline' : 'default'}>
                      <CalendarClock className="h-3 w-3 mr-1" />
                      {isOverdue ? 'Terminou' : 'Termina'} {formatDistanceToNow(new Date(schedule.end_date), { addSuffix: true, locale: ptBR })}
                  </Badge>
                  {schedule.current_streak > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      {schedule.current_streak} {schedule.current_streak === 1 ? 'dia' : 'dias'}
                    </Badge>
                  )}
                  {schedule.freezes_available > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Snowflake className="h-3 w-3 text-blue-400" />
                      {schedule.freezes_available}
                    </Badge>
                  )}
                 </div>
                {isCreator && (
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteSchedule(schedule.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
            </CardFooter>
        </Card>
    );
  }

  if (loading) return <p>Carregando cronogramas do clube...</p>;

  return (
    <div className="space-y-4">
      {schedules.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
            <p>Nenhuma meta de leitura definida para o clube ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {schedules.map(renderScheduleCard)}
        </div>
      )}
    </div>
  );
}
