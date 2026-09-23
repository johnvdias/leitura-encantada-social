import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type Poll = Tables<'club_book_polls'>;
type PollOption = Tables<'club_book_poll_options'>;

export const useClubBookPoll = (clubId: string, isCreator: boolean, onResolved?: () => void) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPoll = useCallback(async () => {
    if (!clubId || !user) return;
    setLoading(true);
    try {
      const { data: pollData, error: pollError } = await supabase
        .from('club_book_polls')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pollError) throw pollError;

      if (!pollData) {
        setPoll(null);
        setOptions([]);
        return;
      }

      setPoll(pollData);

      const { data: optionsData } = await supabase
        .from('club_book_poll_options')
        .select('*')
        .eq('poll_id', pollData.id);

      setOptions((optionsData as PollOption[]) || []);
    } catch (error) {
      console.error('Error fetching club book poll:', error);
    } finally {
      setLoading(false);
    }
  }, [clubId, user]);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  const createPoll = async (candidates: { title: string; author: string; cover_url?: string | null }[]) => {
    if (!user) return;
    try {
      const { data: newPoll, error } = await supabase
        .from('club_book_polls')
        .insert({ club_id: clubId, created_by: user.id })
        .select('*')
        .single();

      if (error) throw error;

      const { error: optionsError } = await supabase.from('club_book_poll_options').insert(
        candidates.map((c) => ({
          poll_id: newPoll.id,
          title: c.title,
          author: c.author,
          cover_url: c.cover_url || null,
        }))
      );
      if (optionsError) throw optionsError;

      toast({ title: 'Sorteio criado!', description: 'Quando quiser, sorteie o próximo livro entre as opções.' });
      await fetchPoll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar o sorteio.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  };

  const drawWinner = async () => {
    if (!user || !poll || options.length === 0 || !isCreator) return;

    setDrawing(true);
    try {
      const winner = options[Math.floor(Math.random() * options.length)];

      const { data: existingBook } = await supabase
        .from('books')
        .select('id')
        .eq('user_id', user.id)
        .ilike('title', winner.title)
        .ilike('author', winner.author)
        .maybeSingle();

      let bookId = existingBook?.id;

      if (!bookId) {
        const { data: newBook, error: bookError } = await supabase
          .from('books')
          .insert({
            user_id: user.id,
            title: winner.title,
            author: winner.author,
            cover_url: winner.cover_url,
            reading_status: 'want_to_read',
          })
          .select('id')
          .single();
        if (bookError) throw bookError;
        bookId = newBook.id;
      }

      const { error: clubError } = await supabase
        .from('clubs')
        .update({ current_book_id: bookId })
        .eq('id', clubId);
      if (clubError) throw clubError;

      const { error: pollError } = await supabase
        .from('club_book_polls')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          claimed_by_current_book_id: bookId,
          winning_option_id: winner.id,
        })
        .eq('id', poll.id);
      if (pollError) throw pollError;

      toast({ title: 'Sorteio feito! 🎉', description: `"${winner.title}" é a nova leitura do clube.` });
      await fetchPoll();
      onResolved?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível fazer o sorteio.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setDrawing(false);
    }
  };

  return { poll, options, loading, drawing, createPoll, drawWinner, refetch: fetchPoll };
};
