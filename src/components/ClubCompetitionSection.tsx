import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Swords, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface RankedMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
}

interface WeeklyRanking {
  week_start: string;
  week_end: string;
  members: RankedMember[];
}

const PODIUM_ORDER = [1, 0, 2]; // exibe 2º, 1º, 3º, como um pódio
const PODIUM_HEIGHT = ['h-20', 'h-28', 'h-16']; // alturas relativas por posição visual (2º, 1º, 3º)
const PODIUM_MEDAL = ['🥈', '🥇', '🥉'];

export function ClubCompetitionSection({ clubId }: { clubId: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WeeklyRanking | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchRanking = async () => {
      setLoading(true);
      try {
        const { data: result, error } = await supabase.rpc('get_club_weekly_ranking', {
          p_club_id: clubId,
        });
        if (error) throw error;
        if (!cancelled) setData(result as unknown as WeeklyRanking);
      } catch (error) {
        console.error('Error fetching club weekly ranking:', error);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRanking();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.members.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Swords className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma integrante pra competir ainda</h3>
          <p className="text-muted-foreground">Assim que o clube tiver integrantes, o placar da semana aparece aqui.</p>
        </CardContent>
      </Card>
    );
  }

  const top3 = data.members.slice(0, 3);
  const rest = data.members.slice(3);
  const hasAnyPoints = data.members.some((m) => m.points > 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          Rinha de Livro
        </h3>
        <p className="text-sm text-muted-foreground">
          Semana de {format(new Date(data.week_start), "dd/MM", { locale: ptBR })} a {format(subDays(new Date(data.week_end), 1), "dd/MM", { locale: ptBR })} · pontos = páginas lidas na semana
        </p>
      </div>

      {!hasAnyPoints ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Ninguém pontuou essa semana ainda</h3>
            <p className="text-muted-foreground">Registre seu progresso de leitura pra entrar no placar.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-end justify-center gap-3 sm:gap-6">
            {PODIUM_ORDER.map((rankIndex, position) => {
              const member = top3[rankIndex];
              if (!member) return <div key={rankIndex} className="flex-1 max-w-[110px]" />;
              const isMe = member.user_id === user?.id;
              return (
                <Link
                  key={member.user_id}
                  to={`/perfil/${member.user_id}`}
                  className="flex-1 max-w-[110px] flex flex-col items-center gap-1 text-center"
                >
                  <span className="text-2xl">{PODIUM_MEDAL[position]}</span>
                  <Avatar className={cn("h-12 w-12 border-2", isMe ? "border-primary" : "border-transparent")}>
                    <AvatarImage src={member.avatar_url ?? undefined} />
                    <AvatarFallback>{member.display_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium truncate w-full">{member.display_name || 'Leitora'}</span>
                  <span className="text-xs text-muted-foreground">{member.points} pts</span>
                  <div className={cn("w-full rounded-t-md bg-primary/15", PODIUM_HEIGHT[position])} />
                </Link>
              );
            })}
          </div>

          {rest.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resto do placar</CardTitle>
                <CardDescription>Posições seguintes da semana</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {rest.map((member, i) => {
                  const isMe = member.user_id === user?.id;
                  return (
                    <Link
                      key={member.user_id}
                      to={`/perfil/${member.user_id}`}
                      className={cn(
                        "flex items-center gap-3 rounded-md -mx-2 px-2 py-1 hover:bg-muted/50",
                        isMe && "bg-primary/5"
                      )}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {i + 4}
                      </span>
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={member.avatar_url ?? undefined} />
                        <AvatarFallback>{member.display_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate flex-1">{member.display_name || 'Leitora'}</span>
                      <span className="text-sm text-muted-foreground shrink-0">{member.points} pts</span>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
