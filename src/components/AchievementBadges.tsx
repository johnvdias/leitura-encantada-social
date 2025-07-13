import { Badge } from "@/components/ui/badge";
import { useAchievements } from "@/hooks/useAchievements";

export function AchievementBadges() {
  const { achievements, loading } = useAchievements();

  if (loading || achievements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Conquistas</h3>
      <div className="flex flex-wrap gap-2">
        {achievements.map((achievement) => (
          <Badge 
            key={achievement.id} 
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1"
            title={achievement.description}
          >
            <span className="text-sm">{achievement.emoji}</span>
            <span className="text-xs">{achievement.achievement_name}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}