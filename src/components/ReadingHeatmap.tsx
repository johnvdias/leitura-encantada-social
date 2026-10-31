import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const WEEKS = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

// Mesma convenção de fuso usada no resto do app (lembretes diários, metas de
// clube): o público é majoritariamente brasileiro, então "hoje" é sempre o
// dia civil em BRT (fixo em UTC-3), não o fuso do aparelho de quem acessa.
// Uma leitura registrada às 23h de BRT já é madrugada do dia seguinte em
// UTC - sem esse ajuste, ela cai no quadradinho do dia errado no calendário.
const brtDateKey = (d: Date) => new Date(d.getTime() - BRT_OFFSET_MS).toISOString().slice(0, 10);

const formatKeyAsBr = (key: string) => {
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${year}`;
};

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
        const key = brtDateKey(new Date(row.created_at));
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

  // "Hoje" como meia-noite UTC do dia civil em BRT - só serve de âncora pra
  // gerar a sequência de dias em passos de 24h; a data civil que cada célula
  // representa é a mesma usada pra chavear os dados (brtDateKey).
  const todayAnchor = new Date(`${brtDateKey(new Date())}T00:00:00.000Z`);
  // Começa no domingo da semana mais antiga exibida, pra alinhar as colunas por semana.
  const start = new Date(todayAnchor.getTime() - (WEEKS * 7 - 1) * DAY_MS);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const totalDays = Math.round((todayAnchor.getTime() - start.getTime()) / DAY_MS) + 1;
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
              const key = day.toISOString().slice(0, 10);
              const count = countsByDay.get(key) || 0;
              const isFuture = day.getTime() > todayAnchor.getTime();
              return (
                <div
                  key={key}
                  title={`${formatKeyAsBr(key)}: ${count} atualização${count === 1 ? '' : 'ões'}`}
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
