import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type Poll = Tables<'club_book_polls'>;
type PollOption = Tables<'club_book_poll_options'>;
type PollVote = Tables<'club_book_poll_votes'>;

export interface PollOptionWithVotes extends PollOption {
  voteCount: number;
  votedByMe: boolean;
}

export const useClubBookPoll = (clubId: string, isCreator: boolean, onResolved?: () => void) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOptionWithVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
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

      const [{ data: optionsData }, { data: votesData }] = await Promise.all([
        supabase.from('club_book_poll_options').select('*').eq('poll_id', pollData.id),
        supabase.from('club_book_poll_votes').select('*').eq('poll_id', pollData.id),
      ]);

      const votes = (votesData as PollVote[]) || [];
      setOptions(
        ((optionsData as PollOption[]) || []).map((opt) => ({
          ...opt,
          voteCount: votes.filter((v) => v.option_id === opt.id).length,
          votedByMe: votes.some((v) => v.option_id === opt.id && v.user_id === user.id),
        }))
      );
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

      toast({ title: 'Votação criada!', description: 'As membros já podem votar no próximo livro.' });
      await fetchPoll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar a votação.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  };

  const castVote = async (optionId: string) => {
    if (!user || !poll) return;
    try {
      const { error } = await supabase
        .from('club_book_poll_votes')
        .upsert({ poll_id: poll.id, option_id: optionId, user_id: user.id }, { onConflict: 'poll_id,user_id' });
      if (error) throw error;
      await fetchPoll();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível registrar seu voto.', variant: 'destructive' });
    }
  };

  const closePoll = async () => {
    if (!user || !poll || options.length === 0 || !isCreator) return;

    setClosing(true);
    try {
      const winner = [...options].sort((a, b) => b.voteCount - a.voteCount)[0];

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
        .update({ status: 'closed', closed_at: new Date().toISOString(), claimed_by_current_book_id: bookId })
        .eq('id', poll.id);
      if (pollError) throw pollError;

      toast({ title: 'Votação encerrada!', description: `"${winner.title}" é a nova leitura do clube.` });
      await fetchPoll();
      onResolved?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível encerrar a votação.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setClosing(false);
    }
  };

  return { poll, options, loading, closing, createPoll, castVote, closePoll, refetch: fetchPoll };
};
