import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, X, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

interface Schedule {
  id: string;
  name: string;
  end_date: string;
  user_status: 'invited' | 'accepted' | 'declined' | null;
  books: { title: string, author: string, cover_url: string };
  reading_goal: { date: string, target: string }[];
}

export function SchedulesSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data: participantData, error: participantError } = await supabase
          .from('schedule_participants')
          .select('schedule_id, status')
          .eq('user_id', user.id);
        if (participantError) throw participantError;

        const scheduleIds = participantData.map(p => p.schedule_id);
        if (scheduleIds.length === 0) {
            setSchedules([]);
            setLoading(false);
            return;
        }

        const { data: schedulesData, error: schedulesError } = await supabase
          .from('group_reading_schedules')
          .select('*, books(*)')
          .in('id', scheduleIds);
        if (schedulesError) throw schedulesError;

        const mappedSchedules = schedulesData.map(s => {
            const userParticipation = participantData.find(p => p.schedule_id === s.id);
            return { ...s, user_status: userParticipation?.status as Schedule['user_status'] }
        }) as Schedule[];
        setSchedules(mappedSchedules);
      } catch (error) {
        toast({ title: 'Erro ao buscar cronogramas', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [user, toast]);

  const handleInvitationResponse = async (scheduleId: string, accept: boolean) => {
    if (!user) return;
    try {
      await supabase
        .from('schedule_participants')
        .update({ status: accept ? 'accepted' : 'declined', joined_at: accept ? new Date().toISOString() : null })
        .eq('schedule_id', scheduleId)
        .eq('user_id', user.id);

      setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, user_status: accept ? 'accepted' : 'declined' } : s));
      toast({ title: `Convite ${accept ? 'aceito' : 'recusado'}!` });
    } catch (error) {
      toast({ title: 'Erro ao responder ao convite', variant: 'destructive' });
    }
  };
  
  if (loading) return <p>Carregando cronogramas...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Calendar/> Cronogramas de Leitura</h2>
        {/* Button to create schedule can be placed here or on book pages */}
      </div>

      {schedules.length === 0 ? (
        <Card className="text-center py-12"><CardContent><p>Nenhum cronograma de leitura em grupo ativo.</p></CardContent></Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {schedules.map(schedule => (
            <Card key={schedule.id}>
              <CardHeader>
                <CardTitle>{schedule.name}</CardTitle>
                <CardDescription>Termina em: {format(new Date(schedule.end_date), "dd/MM/yyyy")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 {schedule.user_status === 'invited' && (
                   <div className="p-3 bg-muted rounded-lg flex justify-between items-center">
                     <p className="font-medium">Você foi convidado!</p>
                     <div className="flex gap-2">
                       <Button size="sm" onClick={() => handleInvitationResponse(schedule.id, true)}><Check className="w-4 h-4"/></Button>
                       <Button size="sm" variant="destructive" onClick={() => handleInvitationResponse(schedule.id, false)}><X className="w-4 h-4"/></Button>
                     </div>
                   </div>
                  )}
                  {/* Further details about the schedule can be rendered here */}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}