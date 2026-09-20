
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { shouldNotify } from "@/lib/notificationPreferences";

type Achievement = Tables<'achievements'>;

export const useAchievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false); // Trava para evitar execuções múltiplas
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAchievements = useCallback(async () => {
    if (!user?.id) return;

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

  const checkAndUnlockAchievements = useCallback(async () => {
    if (!user?.id || isChecking) return; // Verifica a trava

    setIsChecking(true); // Ativa a trava
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

      // First club achievement
      if (!existingTypes.has('first_club')) {
        const { count: clubCount } = await supabase
          .from('club_members')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'approved');

        if ((clubCount || 0) >= 1) {
          achievementsToUnlock.push({
            user_id: user.id,
            achievement_type: 'first_club',
            achievement_name: 'Clube da Leitura',
            description: 'Você entrou no seu primeiro clube',
            emoji: '👯'
          });
        }
      }

      // First review achievement
      if (!existingTypes.has('first_review')) {
        const { count: reviewCount } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('post_type', 'review');

        if ((reviewCount || 0) >= 1) {
          achievementsToUnlock.push({
            user_id: user.id,
            achievement_type: 'first_review',
            achievement_name: 'Crítica Literária',
            description: 'Você escreveu sua primeira resenha',
            emoji: '✍️'
          });
        }
      }

      // 10 comments achievement
      if (!existingTypes.has('ten_comments')) {
        const { count: commentCount } = await supabase
          .from('post_comments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if ((commentCount || 0) >= 10) {
          achievementsToUnlock.push({
            user_id: user.id,
            achievement_type: 'ten_comments',
            achievement_name: 'Voz Ativa',
            description: 'Fez 10 comentários na comunidade',
            emoji: '💬'
          });
        }
      }

      // Genre explorer achievement (3+ different genres among completed books)
      if (!existingTypes.has('genre_explorer')) {
        const { data: genreBooks } = await supabase
          .from('books')
          .select('genre')
          .eq('user_id', user.id)
          .eq('reading_status', 'completed')
          .not('genre', 'is', null);

        const distinctGenres = new Set((genreBooks || []).map(b => b.genre));
        if (distinctGenres.size >= 3) {
          achievementsToUnlock.push({
            user_id: user.id,
            achievement_type: 'genre_explorer',
            achievement_name: 'Exploradora de Gêneros',
            description: 'Leu livros de 3 gêneros diferentes',
            emoji: '🧭'
          });
        }
      }

      // Unlock new achievements
      if (achievementsToUnlock.length > 0) {
        const { error } = await supabase
          .from('achievements')
          .insert(achievementsToUnlock);

        if (error) throw error;

        // Create notifications for new achievements
        const notifyAchievements = await shouldNotify(user.id, 'achievements');
        for (const achievement of achievementsToUnlock) {
          if (notifyAchievements) {
            await supabase
              .from('notifications')
              .insert({
                user_id: user.id,
                type: 'achievement',
                title: 'Nova conquista desbloqueada! 🏆',
                content: `Você desbloqueou: ${achievement.achievement_name}`,
              });
          }

          toast({
            title: "Nova conquista! 🏆",
            description: `${achievement.achievement_name} - ${achievement.description}`,
          });
        }

        await fetchAchievements();
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    } finally {
      setIsChecking(false); // Libera a trava
    }
  }, [user, toast, fetchAchievements, isChecking]);

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
