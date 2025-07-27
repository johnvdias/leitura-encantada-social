import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Check, X } from 'lucide-react';
import { CreateChallengeDialog } from './CreateChallengeDialog';
import { EditChallengeDialog } from './EditChallengeDialog';
import { DeleteChallengeDialog } from './DeleteChallengeDialog'; // Importando o novo componente

interface Challenge {
  id: string;
  name: string;
  description: string;
  goal_type: string;
  goal_value: number;
  start_date: string;
  end_date: string;
  creator_id: string;
  book_id: string | null;
  participants: Participant[];
  user_status: 'invited' | 'accepted' | 'declined' | null;
}

interface Participant {
  user_id: string;
  progress: number;
  status: string;
  profile: {
    display_name: string | null;
  }
}

export function ChallengesSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChallenges = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: participantData, error: participantError } = await supabase
        .from('challenge_participants')
        .select('challenge_id, status')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      const challengeIds = participantData.map(p => p.challenge_id);
      if (challengeIds.length === 0) {
        setChallenges([]);
        setLoading(false);
        return;
      }

      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select(`*, challenge_participants (user_id, progress, status)`)
        .in('id', challengeIds);

      if (challengesError) throw challengesError;

      const allParticipantUserIds = new Set<string>();
      challengesData.forEach(c => {
        (c.challenge_participants as any[]).forEach(p => allParticipantUserIds.add(p.user_id));
      });
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', Array.from(allParticipantUserIds));

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData.map(p => [p.user_id, p]));

      const mappedChallenges = challengesData.map(c => {
        const participants = (c.challenge_participants as any[])
          .map(p => ({ ...p, profile: profilesMap.get(p.user_id) }))
          .filter(p => p.profile)
          .sort((a, b) => b.progress - a.progress);
        
        const userParticipation = participantData.find(p => p.challenge_id === c.id);
        
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          goal_type: c.goal_type,
          goal_value: c.goal_value,
          start_date: c.start_date,
          end_date: c.end_date,
          creator_id: c.creator_id,
          book_id: c.book_id,
          participants: participants as Participant[],
          user_status: userParticipation?.status as Challenge['user_status'],
        };
      });
      
      setChallenges(mappedChallenges);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      toast({ title: 'Erro ao buscar desafios', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const handleInvitationResponse = async (challengeId: string, accept: boolean) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('challenge_participants')
        .update({ 
          status: accept ? 'accepted' : 'declined',
          joined_at: accept ? new Date().toISOString() : null 
        })
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setChallenges(prev => prev.map(c => 
        c.id === challengeId ? { ...c, user_status: accept ? 'accepted' : 'declined' } : c
      ));

      toast({ title: `Convite ${accept ? 'aceito' : 'recusado'}!` });
    } catch (error) {
       toast({ title: 'Erro ao responder ao convite', variant: 'destructive' });
    }
  };

  const renderChallengeCard = (challenge: Challenge) => (
    <Card key={challenge.id} className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{challenge.name}</span>
          <Badge variant={new Date(challenge.end_date) < new Date() ? 'destructive' : 'default'}>
            {new Date(challenge.end_date) < new Date() ? 'Terminado' : 'Ativo'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <p className="text-sm text-muted-foreground">{challenge.description}</p>
        
        {challenge.user_status === 'invited' && (
           <div className="p-3 bg-muted rounded-lg flex justify-between items-center">
             <p className="font-medium">Você foi convidado!</p>
             <div className="flex gap-2">
               <Button size="sm" onClick={() => handleInvitationResponse(challenge.id, true)}><Check className="w-4 h-4"/></Button>
               <Button size="sm" variant="destructive" onClick={() => handleInvitationResponse(challenge.id, false)}><X className="w-4 h-4"/></Button>
             </div>
           </div>
        )}

        <div>
          <h4 className="font-semibold mb-2">Ranking</h4>
          <ul className="space-y-2">
            {challenge.participants.filter(p => p.status === 'accepted').map((p, index) => {
              const progressPercentage = (p.progress / challenge.goal_value) * 100;
              return (
                <li key={p.user_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{index + 1}. {p.profile.display_name}</span>
                    <span className="text-muted-foreground">{p.progress} / {challenge.goal_value} {challenge.goal_type}</span>
                  </div>
                  <Progress value={progressPercentage} />
                </li>
              )
            })}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 mt-auto">
        {user?.id === challenge.creator_id && (
          <>
            <EditChallengeDialog 
              challenge={challenge} 
              onChallengeUpdated={fetchChallenges} 
            />
            <DeleteChallengeDialog
              challengeId={challenge.id}
              challengeName={challenge.name}
              onChallengeDeleted={fetchChallenges}
            />
          </>
        )}
      </CardFooter>
    </Card>
  );

  if (loading) return <p>Carregando desafios...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Trophy/> Desafios</h2>
        <CreateChallengeDialog />
      </div>
      
      {challenges.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Sem desafios por aqui</h3>
            <p className="text-muted-foreground">Crie um novo desafio e convide seus amigos para começar!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {challenges.map(renderChallengeCard)}
        </div>
      )}
    </div>
  );
}