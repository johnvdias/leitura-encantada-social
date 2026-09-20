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
import { Target, TrendingUp, Clock, Flame, Book } from "lucide-react";

interface ReadingGoalsProps {
  className?: string;
}

interface ReadingStats {
  pagesReadToday: number;
  timeReadToday: number;
  booksReadThisYear: number;
}

export function ReadingGoals({ className }: ReadingGoalsProps) {
  const [dailyGoal, setDailyGoal] = useState(10);
  const [annualBooksGoal, setAnnualBooksGoal] = useState(12);
  const [stats, setStats] = useState<ReadingStats>({
    pagesReadToday: 0,
    timeReadToday: 0,
    booksReadThisYear: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { streak } = useStreak();

  const fetchGoalsAndStats = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Fetch goals from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("reading_goal, annual_books_goal")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        setDailyGoal(profileData.reading_goal || 10);
        setAnnualBooksGoal(profileData.annual_books_goal || 12);
      }

      // Fetch today's reading history
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: historyData, error: historyError } = await supabase
        .from("reading_history")
        .select("pages_read, reading_session_minutes")
        .eq("user_id", user.id)
        .gte("created_at", today.toISOString())
        .lt("created_at", tomorrow.toISOString());

      if (historyError) throw historyError;
      
      const pagesReadToday = historyData?.reduce((sum, r) => sum + (r.pages_read || 0), 0) || 0;
      const timeReadToday = historyData?.reduce((sum, r) => sum + (r.reading_session_minutes || 0), 0) || 0;

      // Fetch books completed this year
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
      const { count, error: booksError } = await supabase
        .from("books")
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('reading_status', 'completed')
        .gte('updated_at', yearStart);
        
      if (booksError) throw booksError;

      setStats({
        pagesReadToday,
        timeReadToday,
        booksReadThisYear: count || 0,
      });

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoalsAndStats();
  }, [fetchGoalsAndStats]);

  const updateGoals = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          reading_goal: dailyGoal || 1,
          annual_books_goal: annualBooksGoal || 1
        })
        .eq("user_id", user.id);

      if (error) throw error;
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating goals:", error);
    }
  };

  const dailyProgress = dailyGoal > 0 ? Math.min((stats.pagesReadToday / dailyGoal) * 100, 100) : 0;
  const annualProgress = annualBooksGoal > 0 ? Math.min((stats.booksReadThisYear / annualBooksGoal) * 100, 100) : 0;

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
      <CardContent className="space-y-6">
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="daily">Meta Diária (páginas)</Label>
              <Input
                id="daily"
                type="number"
                min={1}
                value={dailyGoal === 0 ? "" : dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value === "" ? 0 : Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annual">Meta Anual (livros)</Label>
              <Input
                id="annual"
                type="number"
                min={1}
                value={annualBooksGoal === 0 ? "" : annualBooksGoal}
                onChange={(e) => setAnnualBooksGoal(e.target.value === "" ? 0 : Number(e.target.value))}
              />
            </div>
            <Button onClick={updateGoals} className="w-full">
              Salvar Metas
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Meta Diária</span>
                <Badge variant={dailyProgress >= 100 ? "default" : "secondary"}>
                  {stats.pagesReadToday}/{dailyGoal} págs
                </Badge>
              </div>
              <Progress value={dailyProgress} className="h-2" />
               {dailyProgress >= 100 && (
                <p className="text-xs text-green-600 mt-1 text-center">🎉 Meta diária alcançada!</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Meta Anual</span>
                <Badge variant={annualProgress >= 100 ? "default" : "secondary"}>
                  {stats.booksReadThisYear}/{annualBooksGoal} livros
                </Badge>
              </div>
              <Progress value={annualProgress} className="h-2" />
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
                <div className="text-2xl font-bold text-primary">{stats.booksReadThisYear}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Book className="w-3 h-3" />
                  Lidos este ano
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
