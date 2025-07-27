import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CalendarClock, Trash2 } from 'lucide-react';
import { formatDistanceToNow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Schedule {
  id: string;
  name: string;
  reading_goal: string;
  due_date: string;
  books: {
    title: string;
  };
}

interface ClubSchedulesSectionProps {
  clubId: string;
  isCreator: boolean;
  onSchedulesUpdated: () => void;
}

export function ClubSchedulesSection({ clubId, isCreator, onSchedulesUpdated }: ClubSchedulesSectionProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('club_reading_schedules')
        .select(`
          id, name, reading_goal, due_date,
          books (title)
        `)
        .eq('club_id', clubId)
        .order('due_date', { ascending: false });

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
  
  // Expose fetchSchedules to parent through the callback prop
  useEffect(() => {
    onSchedulesUpdated();
  }, [onSchedulesUpdated])

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
    const isOverdue = isPast(new Date(schedule.due_date));

    return (
        <Card key={schedule.id} className={isOverdue ? 'border-dashed' : ''}>
            <CardHeader>
                <CardTitle>{schedule.name}</CardTitle>
                <CardDescription>
                  Meta para: <span className="font-semibold">{schedule.books.title}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{schedule.reading_goal}</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center text-sm">
                 <Badge variant={isOverdue ? 'outline' : 'default'}>
                    <CalendarClock className="h-3 w-3 mr-1" />
                    {isOverdue ? 'Terminou' : 'Termina'} {formatDistanceToNow(new Date(schedule.due_date), { addSuffix: true, locale: ptBR })}
                </Badge>
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
