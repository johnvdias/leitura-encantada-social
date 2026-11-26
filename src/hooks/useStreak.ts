import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// A sequência da meta diária pessoal precisa vir de uma coluna persistida
// (profiles.reading_streak_*), não calculada ao vivo a partir do
// reading_history: o gelinho é estado ("usar" um gelinho pra cobrir um dia
// faltante não dá pra reconstruir só olhando o histórico depois). Quem
// mantém essas colunas em dia é a function evaluate-reading-streaks,
// rodando via cron todo dia às 23:50 BRT - mesmo padrão de
// club_reading_schedules/streak_partnerships.
export const useStreak = () => {
  const [streak, setStreak] = useState(0);
  const [freezes, setFreezes] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchStreak = useCallback(async () => {
    if (!user) {
      setStreak(0);
      setFreezes(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('reading_streak_current, reading_streak_freezes')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setStreak(data?.reading_streak_current || 0);
      setFreezes(data?.reading_streak_freezes || 0);
    } catch (error) {
      console.error("Error fetching streak:", error);
      setStreak(0);
      setFreezes(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  return {
    streak,
    freezes,
    loading,
    refetch: fetchStreak
  };
};
