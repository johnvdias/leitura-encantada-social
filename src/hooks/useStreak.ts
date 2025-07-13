import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useStreak = () => {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const calculateUserStreak = async () => {
    if (!user) {
      setStreak(0);
      setLoading(false);
      return;
    }

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
        setLoading(false);
        return;
      }

      // Calculate streak based on consecutive days with reading activity
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let currentStreak = 0;
      let currentDate = new Date(today);
      
      // Create a set of unique reading dates
      const readingDates = new Set(
        data
          .filter(session => (session.pages_read && session.pages_read > 0) || (session.reading_session_minutes && session.reading_session_minutes > 0))
          .map(session => {
            const date = new Date(session.created_at);
            date.setHours(0, 0, 0, 0);
            return date.getTime();
          })
      );

      // Count consecutive days starting from today or yesterday
      // Check if user read today
      if (readingDates.has(currentDate.getTime())) {
        currentStreak = 1;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        // If not today, check yesterday (streak can continue if missed today)
        currentDate.setDate(currentDate.getDate() - 1);
        if (readingDates.has(currentDate.getTime())) {
          currentStreak = 1;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          // No reading today or yesterday = streak broken
          setStreak(0);
          setLoading(false);
          return;
        }
      }

      // Continue counting backwards
      while (readingDates.has(currentDate.getTime())) {
        currentStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }

      setStreak(currentStreak);
    } catch (error) {
      console.error("Error calculating streak:", error);
      setStreak(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateUserStreak();
  }, [user]);

  return {
    streak,
    loading,
    refetch: calculateUserStreak
  };
};