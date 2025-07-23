import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStreak } from "@/hooks/useStreak";
import { Target, Calendar, TrendingUp, Clock, Flame } from "lucide-react";

interface ReadingGoalsProps {
  className?: string;
}

interface DailyStats {
  pagesReadToday: number;
  timeReadToday: number;
  streak: number;
}

export function ReadingGoals({ className }: ReadingGoalsProps) {
  const [dailyGoal, setDailyGoal] = useState(10);
  const [weeklyGoal, setWeeklyGoal] = useState(70);
  const [stats, setStats] = useState<DailyStats>({
    pagesReadToday: 0,
    timeReadToday: 0,
    streak: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { streak, loading: streakLoading } = useStreak();

  const fetchUserGoals = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("reading_goal")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      
      if (data?.reading_goal) {
        setDailyGoal(Math.round(data.reading_goal / 7)); // Convert weekly to daily
        setWeeklyGoal(data.reading_goal);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  }, [user]);

  const fetchTodayStats = useCallback(async () => {
    if (!user) return;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from("reading_history")
        .select("pages_read, reading_session_minutes, created_at")
        .eq("user_id", user.id)
        .gte("created_at", today.toISOString())
        .lt("created_at", tomorrow.toISOString());

      if (error) throw error;

      const pagesReadToday = data?.reduce((sum, session) => sum + (session.pages_read || 0), 0) || 0;
      const timeReadToday = data?.reduce((sum, session) => sum + (session.reading_session_minutes || 0), 0) || 0;

      setStats({
        pagesReadToday,
        timeReadToday,
        streak: streak,
      });
    } catch (error) {
      console.error("Error fetching today's stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, streak]);

  useEffect(() => {
    if (user) {
      fetchUserGoals();
      fetchTodayStats();
    }
  }, [user, fetchUserGoals, fetchTodayStats]);

  const updateGoals = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ reading_goal: weeklyGoal })
        .eq("user_id", user.id);

      if (error) throw error;
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating goals:", error);
    }
  };

  const dailyProgress = dailyGoal > 0 ? Math.min((stats.pagesReadToday / dailyGoal) * 100, 100) : 0;
  const weeklyProgress = weeklyGoal > 0 ? Math.min(((stats.pagesReadToday * 7) / weeklyGoal) * 100, 100) : 0;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Carregando metas...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Metas de Leitura
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "Cancelar" : "Editar"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="daily">Meta Diária (páginas)</Label>
              <Input
                id="daily"
                type="number"
                min={1}
                value={dailyGoal}
                onChange={(e) => {
                  const daily = Number(e.target.value) || 1;
                  setDailyGoal(daily);
                  setWeeklyGoal(daily * 7);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly">Meta Semanal (páginas)</Label>
              <Input
                id="weekly"
                type="number"
                min={1}
                value={weeklyGoal}
                onChange={(e) => {
                  const weekly = Number(e.target.value) || 7;
                  setWeeklyGoal(weekly);
                  setDailyGoal(Math.round(weekly / 7));
                }}
              />
            </div>
            <Button onClick={updateGoals} className="w-full">
              Salvar Metas
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Meta Diária</span>
                <Badge variant={dailyProgress >= 100 ? "default" : "secondary"}>
                  {stats.pagesReadToday}/{dailyGoal} páginas
                </Badge>
              </div>
              <Progress value={dailyProgress} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center p-3 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{stats.timeReadToday}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  Minutos hoje
                </div>
              </div>
              <div className="text-center p-3 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{Math.round(dailyProgress)}%</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Meta diária
                </div>
              </div>
              <div className="text-center p-3 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-500">{streak}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3" />
                  Dias seguidos
                </div>
              </div>
            </div>

            {dailyProgress >= 100 && (
              <div className="text-center p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  🎉 Meta diária alcançada!
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
