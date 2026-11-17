import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ACHIEVEMENT_CATALOG } from "@/lib/achievementCatalog";
import { Tables } from "@/integrations/supabase/types";

type Achievement = Tables<'achievements'>;

interface AchievementsShowcaseProps {
  achievements: Achievement[];
}

// Vitrine com TODAS as conquistas possíveis, não só as já desbloqueadas -
// quem visita a aba sabe o que ainda falta fazer pra desbloquear o resto,
// igual às insígnias "a conquistar" do app que inspirou a ideia.
export function AchievementsShowcase({ achievements }: AchievementsShowcaseProps) {
  const earnedByType = new Map(achievements.map((a) => [a.achievement_type, a]));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {achievements.length} de {ACHIEVEMENT_CATALOG.length} conquistas desbloqueadas
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ACHIEVEMENT_CATALOG.map((def) => {
          const earned = earnedByType.get(def.type);
          return (
            <Card key={def.type} className={cn("card-enchanted", !earned && "opacity-60")}>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <div className="text-4xl">{earned ? def.emoji : <Lock className="h-8 w-8 mx-auto text-muted-foreground" />}</div>
                  <h3 className="font-semibold">{def.name}</h3>
                  <p className="text-sm text-muted-foreground">{def.description}</p>
                  {earned ? (
                    <Badge variant="secondary" className="text-xs">
                      {formatDistanceToNow(new Date(earned.earned_at), { addSuffix: true, locale: ptBR })}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Bloqueada</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
