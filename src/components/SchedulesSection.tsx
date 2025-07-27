import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, CalendarClock, Users, Book } from 'lucide-react';
import { CreateScheduleDialog } from './CreateScheduleDialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Schedule {
  id: string;
  name: string;
  reading_goal: string;
  due_date: string;
  books: {
    title: string;
    author: string;
    cover_url: string;
  };
  schedule_participants: {
    user_id: string;
    status: 'pending' | 'accepted' | 'declined';
    profiles: {
      avatar_url: string;
    } | null;
  }[];
}

export function SchedulesSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: participantSchedules, error: participantError } = await supabase
        .from('schedule_participants')
        .select('schedule_id')
        .eq('user_id', user.id);
      
      if (participantError) throw participantError;

      const scheduleIds = participantSchedules.map(p => p.schedule_id);
      if (scheduleIds.length === 0) {
        setSchedules([]);
        setLoading(false);
        return;
      }

      const { data: schedulesData, error: schedulesError } = await supabase
        .from('group_reading_schedules')
        .select(`
          id, name, reading_goal, due_date,
          books (title, author, cover_url),
          schedule_participants (
            user_id, status,
            profiles (avatar_url)
          )
        `)
        .in('id', scheduleIds)
        .order('created_at', { ascending: false });

      if (schedulesError) throw schedulesError;
      setSchedules(schedulesData as Schedule[]);

    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast({ title: 'Erro ao buscar cronogramas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleInvitationResponse = async (scheduleId: string, accept: boolean) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('schedule_participants')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('schedule_id', scheduleId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast({ title: `Convite ${accept ? 'aceito' : 'recusado'}!` });
      fetchSchedules(); // Refresh the list
    } catch (error) {
       toast({ title: 'Erro ao responder ao convite', variant: 'destructive' });
    }
  };

  const renderScheduleCard = (schedule: Schedule) => {
    const userStatus = schedule.schedule_participants.find(p => p.user_id === user?.id)?.status;
    const acceptedParticipants = schedule.schedule_participants.filter(p => p.status === 'accepted');

    return (
        <Card key={schedule.id} className="flex flex-col">
            <CardHeader>
                <div className="flex items-start gap-4">
                    <img src={schedule.books.cover_url || '/placeholder.svg'} alt={schedule.books.title} className="h-28 w-20 object-cover rounded" />
                    <div>
                        <CardTitle>{schedule.name}</CardTitle>
                        <CardDescription>Para ler: <span className="font-semibold">{schedule.books.title}</span></CardDescription>
                        <Badge variant="outline" className="mt-2">
                            <CalendarClock className="h-3 w-3 mr-1" />
                            Termina {formatDistanceToNow(new Date(schedule.due_date), { addSuffix: true, locale: ptBR })}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="font-semibold text-sm mb-2">Meta:</p>
                <blockquote className="border-l-2 pl-4 italic text-muted-foreground">
                    {schedule.reading_goal}
                </blockquote>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <div className="flex items-center -space-x-2">
                    {acceptedParticipants.slice(0, 5).map(p => (
                        <Avatar key={p.user_id} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={p.profiles?.avatar_url} />
                            <AvatarFallback>{p.user_id.charAt(0)}</AvatarFallback>
                        </Avatar>
                    ))}
                    {acceptedParticipants.length > 5 && <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs">+{acceptedParticipants.length - 5}</div>}
                </div>
                {userStatus === 'pending' && (
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleInvitationResponse(schedule.id, true)}><Check className="w-4 h-4 mr-1"/> Aceitar</Button>
                        <Button size="sm" variant="outline" onClick={() => handleInvitationResponse(schedule.id, false)}><X className="w-4 h-4 mr-1"/> Recusar</Button>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
  }

  if (loading) return <p>Carregando cronogramas...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2"><CalendarClock/> Cronogramas de Leitura</h2>
        <CreateScheduleDialog onScheduleCreated={fetchSchedules} />
      </div>
      
      {schedules.length === 0 ? (
        <Card className="text-center py-12">
            <CardHeader>
                <Book className="h-12 w-12 mx-auto text-muted-foreground" />
            </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold mb-2">Nenhum cronograma ativo</h3>
            <p className="text-muted-foreground">Crie um cronograma de leitura e convide seus amigos para lerem juntos!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {schedules.map(renderScheduleCard)}
        </div>
      )}
    </div>
  );
}
