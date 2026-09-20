import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const WEEKS = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const dateKey = (d: Date) => d.toISOString().slice(0, 10);

const levelForCount = (count: number) => {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  return 3;
};

const LEVEL_CLASSES = [
  'bg-muted',
  'bg-primary/30',
  'bg-primary/60',
  'bg-primary',
];

export function ReadingHeatmap() {
  const { user } = useAuth();
  const [countsByDay, setCountsByDay] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - WEEKS * 7);

      const { data, error } = await supabase
        .from('reading_history')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', since.toISOString());

      if (error) throw error;

      const counts = new Map<string, number>();
      (data || []).forEach((row) => {
        const key = dateKey(new Date(row.created_at));
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      setCountsByDay(counts);
    } catch (error) {
      console.error('Error fetching reading heatmap:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendário de Leitura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24 text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Começa no domingo da semana mais antiga exibida, pra alinhar as colunas por semana.
  const start = new Date(today.getTime() - (WEEKS * 7 - 1) * DAY_MS);
  start.setDate(start.getDate() - start.getDay());

  const totalDays = Math.round((today.getTime() - start.getTime()) / DAY_MS) + 1;
  const days: Date[] = Array.from({ length: totalDays }, (_, i) => new Date(start.getTime() + i * DAY_MS));

  const activeDays = Array.from(countsByDay.values()).filter((c) => c > 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendário de Leitura</CardTitle>
        <CardDescription>
          {activeDays > 0
            ? `Você leu em ${activeDays} dos últimos ${WEEKS * 7} dias`
            : 'Atualize seu progresso de leitura pra começar a preencher o calendário'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          <div
            className="grid grid-flow-col gap-1"
            style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}
          >
            {days.map((day) => {
              const key = dateKey(day);
              const count = countsByDay.get(key) || 0;
              const isFuture = day.getTime() > today.getTime();
              return (
                <div
                  key={key}
                  title={`${day.toLocaleDateString('pt-BR')}: ${count} atualização${count === 1 ? '' : 'ões'}`}
                  className={`h-3 w-3 rounded-sm ${isFuture ? 'bg-transparent' : LEVEL_CLASSES[levelForCount(count)]}`}
                />
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-end gap-1 mt-2 text-xs text-muted-foreground">
          <span>menos</span>
          {LEVEL_CLASSES.map((cls, i) => (
            <div key={i} className={`h-3 w-3 rounded-sm ${cls}`} />
          ))}
          <span>mais</span>
        </div>
      </CardContent>
    </Card>
  );
}
