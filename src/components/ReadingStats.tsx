import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, TrendingUp, Target } from "lucide-react";

interface ReadingStatsProps {
  bookId: string;
}

interface ReadingHistory {
  id: string;
  pages_read: number;
  reading_session_minutes: number;
  created_at: string;
  new_progress: number;
}

interface Stats {
  totalSessions: number;
  totalPagesRead: number;
  totalMinutesRead: number;
  averagePagesPerSession: number;
  averageMinutesPerSession: number;
  streak: number;
}

export function ReadingStats({ bookId }: ReadingStatsProps) {
  const [history, setHistory] = useState<ReadingHistory[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReadingHistory();
  }, [bookId]);

  const fetchReadingHistory = async () => {
    // Validate bookId before making the query
    if (!bookId || bookId === 'undefined' || bookId === 'null') {
      console.error("Invalid bookId:", bookId);
      setHistory([]);
      setStats(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("reading_history")
        .select("*")
        .eq("book_id", bookId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      setHistory(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error fetching reading history:", error);
      setHistory([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (historyData: ReadingHistory[]) => {
    if (historyData.length === 0) {
      setStats(null);
      return;
    }

    const totalSessions = historyData.length;
    const totalPagesRead = historyData.reduce((sum, session) => sum + (session.pages_read || 0), 0);
    const totalMinutesRead = historyData.reduce((sum, session) => sum + (session.reading_session_minutes || 0), 0);
    
    const sessionsWithPages = historyData.filter(s => s.pages_read > 0);
    const sessionsWithMinutes = historyData.filter(s => s.reading_session_minutes > 0);
    
    const averagePagesPerSession = sessionsWithPages.length > 0 
      ? Math.round(totalPagesRead / sessionsWithPages.length) 
      : 0;
    
    const averageMinutesPerSession = sessionsWithMinutes.length > 0 
      ? Math.round(totalMinutesRead / sessionsWithMinutes.length) 
      : 0;

    // Calculate reading streak (consecutive days with reading sessions)
    const streak = calculateStreak(historyData);

    setStats({
      totalSessions,
      totalPagesRead,
      totalMinutesRead,
      averagePagesPerSession,
      averageMinutesPerSession,
      streak,
    });
  };

  const calculateStreak = (historyData: ReadingHistory[]): number => {
    if (historyData.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);
    
    const readingDates = new Set(
      historyData.map(session => {
        const date = new Date(session.created_at);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    );

    while (readingDates.has(currentDate.getTime())) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Estatísticas de Leitura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Estatísticas de Leitura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Nenhuma sessão de leitura registrada ainda.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Estatísticas de Leitura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{stats.totalSessions}</div>
            <div className="text-xs text-muted-foreground">Sessões</div>
          </div>
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{stats.totalPagesRead}</div>
            <div className="text-xs text-muted-foreground">Páginas lidas</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Sequência atual
            </span>
            <Badge variant="secondary">{stats.streak} dias</Badge>
          </div>
          
          {stats.averagePagesPerSession > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                Média por sessão
              </span>
              <span className="text-muted-foreground">{stats.averagePagesPerSession} páginas</span>
            </div>
          )}
          
          {stats.totalMinutesRead > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Tempo total
              </span>
              <span className="text-muted-foreground">{Math.round(stats.totalMinutesRead / 60)}h {stats.totalMinutesRead % 60}min</span>
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Últimas sessões</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {history.slice(0, 5).map((session) => (
                <div key={session.id} className="flex justify-between items-center text-xs p-2 bg-secondary/30 rounded">
                  <span>{new Date(session.created_at).toLocaleDateString('pt-BR')}</span>
                  <div className="flex gap-2 text-muted-foreground">
                    {session.pages_read > 0 && <span>{session.pages_read}p</span>}
                    {session.reading_session_minutes > 0 && <span>{session.reading_session_minutes}min</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}