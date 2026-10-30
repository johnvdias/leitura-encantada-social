import { supabase } from "@/integrations/supabase/client";

interface ClubScheduleGoalHit {
  clubName: string;
  dailyTarget: number;
}

interface StructuredGoal {
  unit?: string;
  daily_target?: number;
}

// Chamado depois de registrar uma sessão de leitura: verifica se esse livro
// é o livro atual de algum cronograma de clube ativo da usuária e, se essa
// sessão fez a meta diária daquele cronograma ser batida AGORA (e não já
// estava acima antes dela, pra não repetir o aviso a cada atualização do
// dia). Sem isso, a meta era batida "silenciosamente": só aparecia por um
// dia no card do cronograma e sumia no dia seguinte sem nenhuma confirmação,
// dando a impressão de que não tinha contado. Só cobre cronogramas em
// páginas - não existe registro de "capítulo lido" pra medir os em
// capítulos.
export const checkClubScheduleGoalHit = async (
  userId: string,
  bookId: string,
  pagesReadNow: number
): Promise<ClubScheduleGoalHit | null> => {
  if (pagesReadNow <= 0) return null;

  try {
    const { data: book } = await supabase
      .from('books')
      .select('title, author')
      .eq('id', bookId)
      .maybeSingle();
    if (!book) return null;

    const { data: memberships } = await supabase
      .from('club_members')
      .select('club_id')
      .eq('user_id', userId)
      .eq('status', 'approved');
    const clubIds = (memberships || []).map((m) => m.club_id);
    if (clubIds.length === 0) return null;

    const { data: schedules } = await supabase
      .from('club_reading_schedules')
      .select('id, reading_goal, end_date, clubs(name), books(title, author)')
      .in('club_id', clubIds)
      .gte('end_date', new Date().toISOString());

    const normalize = (s: string) => s.trim().toLowerCase();
    const targetTitle = normalize(book.title);
    const targetAuthor = normalize(book.author || '');

    const schedule = (schedules || []).find((s) => {
      const goal = s.reading_goal as StructuredGoal | null;
      if (!goal || goal.unit !== 'pages' || !goal.daily_target) return false;
      const sb = s.books as { title: string; author: string } | null;
      if (!sb) return false;
      return normalize(sb.title) === targetTitle && normalize(sb.author || '') === targetAuthor;
    });

    if (!schedule) return null;
    const goal = schedule.reading_goal as Required<StructuredGoal>;

    const now = new Date();
    const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const todayBrt = brtNow.toISOString().slice(0, 10);
    const todayStartIso = `${todayBrt}T03:00:00.000Z`;

    const { data: historyToday } = await supabase
      .from('reading_history')
      .select('pages_read')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .gte('created_at', todayStartIso);

    const totalToday = (historyToday || []).reduce((sum, r) => sum + (r.pages_read || 0), 0);
    const beforeToday = totalToday - pagesReadNow;

    if (beforeToday < goal.daily_target && totalToday >= goal.daily_target) {
      const clubName = (schedule.clubs as { name: string } | null)?.name || 'clube';
      return { clubName, dailyTarget: goal.daily_target };
    }

    return null;
  } catch {
    return null;
  }
};
