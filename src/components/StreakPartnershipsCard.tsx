import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Flame, Snowflake, Check, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStreakPartnerships, StreakPartnershipProgress } from "@/hooks/useStreakPartnerships";

// Mostra todas as ofensivas em dupla da usuária: convites pendentes (pra
// aceitar/recusar ou aguardando resposta) e as ativas, com status de hoje
// de cada uma das duas.
export function StreakPartnershipsCard() {
  const { user } = useAuth();
  const { partnerships, loading, respondToPartnership, endPartnership, getProgress } = useStreakPartnerships();
  const [progressById, setProgressById] = useState<Record<string, StreakPartnershipProgress>>({});
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const activePartnerships = partnerships.filter((p) => p.status === 'active');
  const incomingInvites = partnerships.filter((p) => p.isIncomingInvite);
  const outgoingInvites = partnerships.filter((p) => p.isOutgoingInvite);

  useEffect(() => {
    activePartnerships.forEach((partnership) => {
      getProgress(partnership.id).then((progress) => {
        if (progress) setProgressById((prev) => ({ ...prev, [partnership.id]: progress }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePartnerships.map((p) => p.id).join(',')]);

  if (loading || partnerships.length === 0) return null;

  const handleRespond = async (id: string, accept: boolean) => {
    setRespondingId(id);
    await respondToPartnership(id, accept);
    setRespondingId(null);
  };

  const metGoalFor = (progress: StreakPartnershipProgress | undefined, userId: string) => {
    if (!progress) return null;
    if (progress.user_a_id === userId) return progress.user_a_met_goal;
    if (progress.user_b_id === userId) return progress.user_b_met_goal;
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Ofensiva em Dupla
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {incomingInvites.map((invite) => (
          <div key={invite.id} className="flex items-center gap-3 p-3 rounded-lg border bg-secondary/30">
            <Link to={`/perfil/${invite.partnerId}`}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={invite.partner?.avatar_url || undefined} />
                <AvatarFallback>{invite.partner?.display_name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <Link to={`/perfil/${invite.partnerId}`} className="font-medium hover:underline">
                  {invite.partner?.display_name || 'Uma amiga'}
                </Link>{' '}
                te convidou pra uma ofensiva em dupla! 🔥
              </p>
            </div>
            <Button size="icon" variant="outline" disabled={respondingId === invite.id} onClick={() => handleRespond(invite.id, true)}>
              {respondingId === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
            </Button>
            <Button size="icon" variant="outline" disabled={respondingId === invite.id} onClick={() => handleRespond(invite.id, false)}>
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}

        {outgoingInvites.map((invite) => (
          <div key={invite.id} className="flex items-center gap-3 p-3 rounded-lg border">
            <Avatar className="h-10 w-10">
              <AvatarImage src={invite.partner?.avatar_url || undefined} />
              <AvatarFallback>{invite.partner?.display_name?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{invite.partner?.display_name || 'Uma amiga'}</p>
              <p className="text-xs text-muted-foreground">Convite enviado, aguardando resposta...</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => endPartnership(invite.id)}>Cancelar</Button>
          </div>
        ))}

        {activePartnerships.map((partnership) => {
          const progress = progressById[partnership.id];
          const iMetGoal = user ? metGoalFor(progress, user.id) : null;
          const partnerMetGoal = metGoalFor(progress, partnership.partnerId);

          return (
            <div key={partnership.id} className="flex items-center gap-3 p-3 rounded-lg border">
              <Link to={`/perfil/${partnership.partnerId}`}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={partnership.partner?.avatar_url || undefined} />
                  <AvatarFallback>{partnership.partner?.display_name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/perfil/${partnership.partnerId}`} className="font-medium hover:underline">
                  {partnership.partner?.display_name || 'Sua parceira'}
                </Link>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="gap-1">
                    <Flame className="h-3 w-3 text-orange-500" />
                    {partnership.currentStreak} {partnership.currentStreak === 1 ? 'dia' : 'dias'}
                  </Badge>
                  {partnership.freezesAvailable > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Snowflake className="h-3 w-3 text-blue-400" />
                      {partnership.freezesAvailable}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Você {iMetGoal === null ? '...' : iMetGoal ? '✅' : '⏳'} · {partnership.partner?.display_name?.split(' ')[0] || 'Ela'} {partnerMetGoal === null ? '...' : partnerMetGoal ? '✅' : '⏳'}
                  </span>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar ofensiva em dupla?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Vocês perdem a sequência de {partnership.currentStreak} dias com {partnership.partner?.display_name || 'essa amiga'}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => endPartnership(partnership.id)}>Sim, encerrar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
