import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AchievementData } from "@/data/achievements";

interface AchievementBadgeProps {
  achievement: AchievementData;
  earnedAt?: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

export function AchievementBadge({
  achievement,
  earnedAt,
  size = "md",
  showTooltip = true,
}: AchievementBadgeProps) {
  const sizeClasses = {
    sm: "w-12 h-12 text-xl",
    md: "w-16 h-16 text-2xl",
    lg: "w-20 h-20 text-3xl",
  };

  const cardSizeClasses = {
    sm: "p-2",
    md: "p-3",
    lg: "p-4",
  };

  return (
    <div className="relative group">
      <Card
        className={cn(
          "transition-all duration-200 hover:scale-105 cursor-pointer",
          achievement.color.includes("gradient") ? achievement.color : "",
          !achievement.color.includes("gradient")
            ? `border-2 ${achievement.color} border-opacity-50`
            : "",
        )}
      >
        <CardContent
          className={cn(
            "flex items-center justify-center",
            cardSizeClasses[size],
          )}
        >
          <div
            className={cn(
              "rounded-full flex items-center justify-center text-white font-bold shadow-lg",
              sizeClasses[size],
              !achievement.color.includes("gradient")
                ? achievement.color
                : "bg-gradient-to-r from-purple-500 to-pink-500",
            )}
          >
            <span className="drop-shadow-md">{achievement.emoji}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div className="bg-black text-white text-xs rounded py-2 px-3 min-w-max shadow-lg">
            <div className="font-semibold">{achievement.name}</div>
            <div className="text-gray-300">{achievement.description}</div>
            {earnedAt && (
              <div className="text-gray-400 text-xs mt-1">
                Conquistado em {new Date(earnedAt).toLocaleDateString("pt-BR")}
              </div>
            )}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
        </div>
      )}
    </div>
  );
}

export function AchievementBadgeGrid({
  achievements,
}: {
  achievements: any[];
}) {
  return (
    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
      {achievements.map((achievement) => (
        <AchievementBadge
          key={achievement.id}
          achievement={achievement}
          earnedAt={achievement.earned_at}
          size="sm"
        />
      ))}
    </div>
  );
}
