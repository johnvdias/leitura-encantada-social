import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarClock, Trash2, Flame, Snowflake, Target, CheckCircle2, Circle } from 'lucide-react';
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
    author: string;
  };
}

interface MemberProgress {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  hasStarted: boolean;
  overallProgress: number;
  metToday: boolean;
}

interface ScheduleProgress {
  members: MemberProgress[];
  met: number;
  total: number;
  // "target": comparou páginas lidas hoje com a meta diária (só dá pra medir
  // assim quando a unidade é páginas - não existe registro de "capítulo
  // lido" em reading_history). "participation": só sabe dizer quem leu
  // alguma coisa hoje, sem comparar com a meta exata.
  mode: 'target' | 'participation';
}

interface ClubSchedulesSectionProps {
  clubId: string;
  isCreator: boolean;
  onSchedulesUpdated: () => void;
}

export function ClubSchedulesSection({ clubId, isCreator }: ClubSchedulesSectionProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleProgress, setScheduleProgress] = useState<Record<string, ScheduleProgress>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Progresso de cada integrante no cronograma, calculado na hora (não
  // depende da rotina diária que atualiza fogo/gelinho uma vez por dia).
  // reading_history guarda o progresso no livro de CADA membra, que tem seu
  // próprio id de livro (não existe um livro compartilhado entre elas) - por
  // isso o casamento por título+autor normalizado, igual o cálculo de
  // "X de Y concluíram" já feito em ClubePage.
  const fetchScheduleProgress = useCallback(async (list: Schedule[]) => {
    const now = new Date();
    const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const todayBrt = brtNow.toISOString().slice(0, 10);
    const todayStartIso = `${todayBrt}T03:00:00.000Z`;

    const entries = await Promise.all(
      list
        .filter((s) => isStructuredGoal(s.reading_goal) && !isPast(new Date(s.end_date)))
        .map(async (schedule): Promise<[string, ScheduleProgress] | null> => {
          const goal = schedule.reading_goal as StructuredGoal;

          const { data: participants } = await supabase
            .from('club_schedule_participants')
            .select('user_id')
            .eq('club_schedule_id', schedule.id);
          const participantIds = (participants || []).map((p) => p.user_id);
          if (participantIds.length === 0) return null;

          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', participantIds);
          const profileById = new Map((profiles || []).map((p) => [p.user_id, p]));

          const { data: memberBooks } = await supabase
            .from('books')
            .select('id, user_id, title, author, reading_progress')
            .in('user_id', participantIds);

          const normalize = (s: string) => s.trim().toLowerCase();
          const targetTitle = normalize(schedule.books.title);
          const targetAuthor = normalize(schedule.books.author || '');
          const bookIdToUser = new Map<string, string>();
          const bookByUser = new Map<string, { reading_progress: number }>();
          for (const b of memberBooks || []) {
            if (normalize(b.title) === targetTitle && normalize(b.author || '') === targetAuthor) {
              bookIdToUser.set(b.id, b.user_id);
              bookByUser.set(b.user_id, { reading_progress: b.reading_progress || 0 });
            }
          }
          const bookIds = Array.from(bookIdToUser.keys());

          const pagesByUser = new Map<string, number>();
          const activeToday = new Set<string>();
          if (bookIds.length > 0) {
            const { data: historyToday } = await supabase
              .from('reading_history')
              .select('book_id, pages_read, reading_session_minutes')
              .in('book_id', bookIds)
              .gte('created_at', todayStartIso);

            for (const row of historyToday || []) {
              const userId = bookIdToUser.get(row.book_id);
              if (!userId) continue;
              pagesByUser.set(userId, (pagesByUser.get(userId) || 0) + (row.pages_read || 0));
              if ((row.pages_read || 0) > 0 || (row.reading_session_minutes || 0) > 0) activeToday.add(userId);
            }
          }

          const members: MemberProgress[] = participantIds.map((userId) => {
            const profile = profileById.get(userId);
            const book = bookByUser.get(userId);
            const metToday = goal.unit === 'pages'
              ? (pagesByUser.get(userId) || 0) >= goal.daily_target
              : activeToday.has(userId);

            return {
              userId,
              displayName: profile?.display_name || 'Integrante',
              avatarUrl: profile?.avatar_url || null,
              hasStarted: !!book,
              overallProgress: book?.reading_progress || 0,
              metToday,
            };
          });

          const met = members.filter((m) => m.metToday).length;
          return [schedule.id, { members, met, total: participantIds.length, mode: goal.unit === 'pages' ? 'target' : 'participation' }];
        })
    );

    setScheduleProgress(Object.fromEntries(entries.filter((e): e is [string, ScheduleProgress] => e !== null)));
  }, []);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('club_reading_schedules')
        .select(`
          id, name, reading_goal, end_date, current_streak, freezes_available,
          books (title, author)
        `)
        .eq('club_id', clubId)
        .order('end_date', { ascending: false });

      if (error) throw error;
      const list = (data || []) as Schedule[];
      setSchedules(list);
      fetchScheduleProgress(list).catch((err) => console.error('Error computing schedule progress:', err));
    } catch (error) {
      console.error("Error fetching club schedules:", error);
      toast({ title: 'Erro ao buscar cronogramas do clube', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [clubId, toast, fetchScheduleProgress]);

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
    const progress = scheduleProgress[schedule.id];

    return (
        <Card key={schedule.id} className={isOverdue ? 'border-dashed' : ''}>
            <CardHeader>
                <CardTitle>{schedule.name}</CardTitle>
                <CardDescription>
                  Meta para: <span className="font-semibold">{schedule.books.title}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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

                {progress && progress.total > 0 && (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {progress.mode === 'target' ? 'Bateram a meta de hoje' : 'Leram hoje'}
                        </span>
                        <span>{progress.met} de {progress.total}</span>
                      </div>
                      <Progress value={(progress.met / progress.total) * 100} className="h-1.5" />
                    </div>

                    <div className="space-y-2 pt-1 border-t">
                      {progress.members.map((member) => (
                        <div key={member.userId} className="flex items-center gap-2 pt-2">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={member.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">{member.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate font-medium">{member.displayName}</span>
                              {member.metToday ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                              )}
                            </div>
                            <Progress value={member.overallProgress} className="h-1" />
                          </div>
                          <span className="text-xs text-muted-foreground w-9 text-right shrink-0">
                            {member.hasStarted ? `${member.overallProgress}%` : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
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
