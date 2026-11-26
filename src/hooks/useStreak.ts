import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { brtDateKey } from "@/lib/brtDate";

export const useStreak = () => {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const calculateUserStreak = useCallback(async () => {
    if (!user) {
      setStreak(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get all reading history for the user, ordered by date
      const { data, error } = await supabase
        .from('reading_history')
        .select('created_at, pages_read, reading_session_minutes')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setStreak(0);
        return;
      }

      // Calculate streak based on consecutive days with reading activity.
      // Dia civil em BRT (não o fuso do aparelho) - mesma convenção do resto
      // do app, pra uma leitura feita à noite não cair no dia seguinte.
      const shiftDateKey = (key: string, days: number) => {
        const d = new Date(`${key}T00:00:00.000Z`);
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().slice(0, 10);
      };

      let currentStreak = 0;
      let cursor = brtDateKey(new Date());

      // Create a set of unique reading dates
      const readingDates = new Set(
        data
          .filter(session => (session.pages_read && session.pages_read > 0) || (session.reading_session_minutes && session.reading_session_minutes > 0))
          .map(session => brtDateKey(new Date(session.created_at)))
      );

      // Count consecutive days starting from today or yesterday
      // Check if user read today
      if (readingDates.has(cursor)) {
        currentStreak = 1;
        cursor = shiftDateKey(cursor, -1);
      } else {
        // If not today, check yesterday (streak can continue if missed today)
        cursor = shiftDateKey(cursor, -1);
        if (readingDates.has(cursor)) {
          currentStreak = 1;
          cursor = shiftDateKey(cursor, -1);
        } else {
          // No reading today or yesterday = streak broken
          setStreak(0);
          return;
        }
      }

      // Continue counting backwards
      while (readingDates.has(cursor)) {
        currentStreak++;
        cursor = shiftDateKey(cursor, -1);
      }

      setStreak(currentStreak);
    } catch (error) {
      console.error("Error calculating streak:", error);
      setStreak(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    calculateUserStreak();
  }, [calculateUserStreak]);

  return {
    streak,
    loading,
    refetch: calculateUserStreak
  };
};
