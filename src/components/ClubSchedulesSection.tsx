import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, BookOpen, Users, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClubSchedule {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  reading_goal: { date: string, target: string }[];
  books: { title: string, author: string, cover_url: string };
  creator_id: string;
  participants: Participant[];
}

interface Participant {
  user_id: string;
  progress: number;
  profiles: { display_name: string; avatar_url: string; };
}

interface ClubSchedulesSectionProps {
  clubId: string;
  isCreator: boolean;
}

export function ClubSchedulesSection({ clubId, isCreator }: ClubSchedulesSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ClubSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClubSchedules = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('club_reading_schedules')
        .select(`
          *,
          books (title, author, cover_url),
          club_schedule_participants (
            user_id,
            progress,
            profiles (display_name, avatar_url)
          )
        `)
        .eq('club_id', clubId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchedules(data as unknown as ClubSchedule[] || []);
    } catch (error) {
      console.error("Error fetching club schedules:", error);
      toast({ title: 'Erro ao carregar cronogramas do clube', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [clubId, toast]);

  useEffect(() => {
    fetchClubSchedules();
  }, [fetchClubSchedules]);

  const handleJoinSchedule = async (scheduleId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('club_schedule_participants')
        .insert({
          club_schedule_id: scheduleId,
          user_id: user.id,
          progress: 0, // Initial progress is 0
        });

      if (error) throw error;
      toast({ title: 'Você entrou no cronograma!' });
      fetchClubSchedules(); // Re-fetch to update participation status
    } catch (error) {
      toast({ title: 'Erro ao entrar no cronograma', variant: 'destructive' });
    }
  };

  if (loading) return <p>Carregando cronogramas do clube...</p>;

  return (
    <div className="space-y-6">
      {/* Create schedule button (only for creator/admin) */}
      {isCreator && (
        <div className="flex justify-end">
          {/* CreateClubScheduleDialog will be added here */}
        </div>
      )}

      {schedules.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Nenhum cronograma de leitura para este clube.</h3>
            {isCreator && <p className="text-muted-foreground">Crie o primeiro cronograma para o clube!</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {schedules.map(schedule => {
            const isParticipating = schedule.participants.some(p => p.user_id === user?.id);
            const isFinished = new Date(schedule.end_date) < new Date();

            return (
              <Card key={schedule.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{schedule.name}</span>
                    <Badge variant={isFinished ? 'destructive' : 'default'}>
                      {isFinished ? 'Finalizado' : 'Ativo'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    De {format(new Date(schedule.start_date), "dd/MM/yyyy", { locale: ptBR })} 
                    até {format(new Date(schedule.end_date), "dd/MM/yyyy", { locale: ptBR })}
                  </CardDescription>
                  {schedule.books && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <BookOpen className="h-4 w-4" />
                      <span>{schedule.books.title} por {schedule.books.author}</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isParticipating && !isFinished && (
                    <div className="text-center">
                      <Button onClick={() => handleJoinSchedule(schedule.id)}>
                        <Check className="mr-2 h-4 w-4" /> Participar do Cronograma
                      </Button>
                    </div>
                  )}
                  
                  {isParticipating && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Seu Progresso:</h4>
                      {/* This progress needs to be dynamically updated based on user's reading progress for the book */}
                      <Progress value={0} className="w-full" /> {/* Placeholder for actual progress */}
                      <p className="text-sm text-muted-foreground">Atualize o progresso do livro na sua estante para ver a barra avançar.</p>
                    </div>
                  )}

                  {schedule.reading_goal && schedule.reading_goal.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Metas:</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {schedule.reading_goal.map((goal, idx) => (
                          <li key={idx}>
                            Até {format(new Date(goal.date), "dd/MM", { locale: ptBR })}: {goal.target}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <h4 className="font-semibold">Participantes:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {schedule.participants.map(participant => (
                      <div key={participant.user_id} className="flex items-center gap-2">
                        <img src={participant.profiles.avatar_url || '/placeholder.svg'} alt={participant.profiles.display_name} className="w-8 h-8 rounded-full object-cover" />
                        <span>{participant.profiles.display_name}</span>
                        {/* Display participant's progress here if available */}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}