
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

type Achievement = Tables<'achievements'>;

export const useAchievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAchievements = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const checkAndUnlockAchievements = async () => {
    if (!user) return;

    try {
      // Check for book completion achievements
      const { data: completedBooks } = await supabase
        .from('books')
        .select('id')
        .eq('user_id', user.id)
        .eq('reading_status', 'completed');

      const completedCount = completedBooks?.length || 0;

      // Check for existing achievements to avoid duplicates
      const { data: existingAchievements } = await supabase
        .from('achievements')
        .select('achievement_type')
        .eq('user_id', user.id);

      const existingTypes = new Set(existingAchievements?.map(a => a.achievement_type) || []);

      const achievementsToUnlock: TablesInsert<'achievements'>[] = [];

      // First book achievement
      if (completedCount >= 1 && !existingTypes.has('first_book')) {
        achievementsToUnlock.push({
          user_id: user.id,
          achievement_type: 'first_book',
          achievement_name: 'Primeiro Livro',
          description: 'Parabéns! Você leu seu primeiro livro',
          emoji: '📚'
        });
      }

      // 5 books achievement
      if (completedCount >= 5 && !existingTypes.has('five_books')) {
        achievementsToUnlock.push({
          user_id: user.id,
          achievement_type: 'five_books',
          achievement_name: 'Leitor Dedicado',
          description: 'Incrível! Você já leu 5 livros',
          emoji: '📖'
        });
      }

      // 10 books achievement
      if (completedCount >= 10 && !existingTypes.has('ten_books')) {
        achievementsToUnlock.push({
          user_id: user.id,
          achievement_type: 'ten_books',
          achievement_name: 'Bibliófilo',
          description: 'Fantástico! Você já leu 10 livros',
          emoji: '📚✨'
        });
      }

      // 25 books achievement
      if (completedCount >= 25 && !existingTypes.has('bookworm')) {
        achievementsToUnlock.push({
          user_id: user.id,
          achievement_type: 'bookworm',
          achievement_name: 'Rato de Biblioteca',
          description: 'Impressionante! 25 livros lidos',
          emoji: '🐛'
        });
      }

      // Reading streak achievement
      const { data: streakData } = await supabase
        .from('reading_history')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(7);

      if (streakData && streakData.length >= 7 && !existingTypes.has('reading_streak')) {
        achievementsToUnlock.push({
          user_id: user.id,
          achievement_type: 'reading_streak',
          achievement_name: 'Sequência de Fogo',
          description: 'Leu por 7 dias consecutivos',
          emoji: '🔥'
        });
      }

      // Unlock new achievements
      if (achievementsToUnlock.length > 0) {
        const { error } = await supabase
          .from('achievements')
          .insert(achievementsToUnlock);

        if (error) throw error;

        // Create notifications for new achievements
        for (const achievement of achievementsToUnlock) {
          await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              type: 'achievement',
              title: 'Nova conquista desbloqueada! 🏆',
              content: `Você desbloqueou: ${achievement.achievement_name}`,
            });

          toast({
            title: "Nova conquista! 🏆",
            description: `${achievement.achievement_name} - ${achievement.description}`,
          });
        }

        await fetchAchievements();
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return {
    achievements,
    loading,
    checkAndUnlockAchievements,
    refetch: fetchAchievements
  };
};