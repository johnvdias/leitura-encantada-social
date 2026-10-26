import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { notifyClubMembers } from "@/lib/notifyClubMembers";
import { Tables } from "@/integrations/supabase/types";

type Poll = Tables<'club_book_polls'>;
type PollOption = Tables<'club_book_poll_options'>;
type PollVote = Tables<'club_book_poll_votes'>;
type PollMode = 'draw' | 'vote';

export const useClubBookPoll = (clubId: string, isCreator: boolean, onResolved?: () => void) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
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
        setVotes([]);
        return;
      }

      setPoll(pollData);

      const { data: optionsData } = await supabase
        .from('club_book_poll_options')
        .select('*')
        .eq('poll_id', pollData.id);

      setOptions((optionsData as PollOption[]) || []);

      const { data: votesData } = await supabase
        .from('club_book_poll_votes')
        .select('*')
        .eq('poll_id', pollData.id);

      setVotes((votesData as PollVote[]) || []);
    } catch (error) {
      console.error('Error fetching club book poll:', error);
    } finally {
      setLoading(false);
    }
  }, [clubId, user]);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  // Votos de outras membras no mesmo sorteio/votação atualizam a contagem
  // sozinhos, sem precisar recarregar a página.
  useEffect(() => {
    if (!poll?.id) return;

    const channel = supabase
      .channel(`club-book-poll-votes-${poll.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'club_book_poll_votes',
          filter: `poll_id=eq.${poll.id}`
        },
        () => {
          fetchPoll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [poll?.id, fetchPoll]);

  const createPoll = async (
    candidates: { title: string; author: string; cover_url?: string | null }[],
    mode: PollMode = 'draw'
  ) => {
    if (!user) return;
    try {
      const { data: newPoll, error } = await supabase
        .from('club_book_polls')
        .insert({ club_id: clubId, created_by: user.id, mode })
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

      toast(
        mode === 'draw'
          ? { title: 'Sorteio criado!', description: 'Quando quiser, sorteie o próximo livro entre as opções.' }
          : { title: 'Votação criada!', description: 'As membras já podem votar na opção favorita.' }
      );

      notifyClubMembers({
        clubId,
        excludeUserId: user.id,
        type: 'club_poll',
        title: mode === 'draw' ? '🎲 Novo sorteio no clube!' : '🗳️ Nova votação no clube!',
        content: mode === 'draw'
          ? 'Confira as opções propostas pro próximo livro do clube.'
          : 'Vote na sua opção favorita pro próximo livro do clube.',
        relatedId: clubId,
      }).catch(() => {
        // Notificar é best-effort; o sorteio/votação já foi criado.
      });

      await fetchPoll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar o sorteio.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  };

  const resolvePoll = async (winner: PollOption) => {
    if (!user || !poll) return;

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

    notifyClubMembers({
      clubId,
      excludeUserId: user.id,
      type: 'club_poll',
      title: poll.mode === 'draw' ? '🎲 Sorteio feito!' : '🗳️ Votação encerrada!',
      content: `"${winner.title}" é a nova leitura do clube!`,
      relatedId: clubId,
    }).catch(() => {
      // Notificar é best-effort; o resultado já foi salvo.
    });

    await fetchPoll();
    onResolved?.();
  };

  const drawWinner = async () => {
    if (!user || !poll || options.length === 0 || !isCreator) return;

    setDrawing(true);
    try {
      const winner = options[Math.floor(Math.random() * options.length)];
      await resolvePoll(winner);
      toast({ title: 'Sorteio feito! 🎉', description: `"${winner.title}" é a nova leitura do clube.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível fazer o sorteio.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setDrawing(false);
    }
  };

  const castVote = async (optionId: string) => {
    if (!user || !poll) return;
    try {
      const existingVote = votes.find((v) => v.user_id === user.id);

      if (existingVote?.option_id === optionId) {
        const { error } = await supabase
          .from('club_book_poll_votes')
          .delete()
          .eq('id', existingVote.id);
        if (error) throw error;
      } else if (existingVote) {
        const { error } = await supabase
          .from('club_book_poll_votes')
          .update({ option_id: optionId })
          .eq('id', existingVote.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('club_book_poll_votes')
          .insert({ poll_id: poll.id, option_id: optionId, user_id: user.id });
        if (error) throw error;
      }

      await fetchPoll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível registrar seu voto.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  };

  const finishVote = async () => {
    if (!user || !poll || options.length === 0 || !isCreator) return;

    setDrawing(true);
    try {
      const countsByOption = new Map<string, number>();
      for (const vote of votes) {
        countsByOption.set(vote.option_id, (countsByOption.get(vote.option_id) || 0) + 1);
      }

      const maxVotes = Math.max(0, ...options.map((o) => countsByOption.get(o.id) || 0));
      const tiedOptions = maxVotes > 0
        ? options.filter((o) => (countsByOption.get(o.id) || 0) === maxVotes)
        : options;

      const winner = tiedOptions[Math.floor(Math.random() * tiedOptions.length)];
      await resolvePoll(winner);
      toast({ title: 'Votação encerrada! 🎉', description: `"${winner.title}" é a nova leitura do clube.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível encerrar a votação.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setDrawing(false);
    }
  };

  const myVote = user ? votes.find((v) => v.user_id === user.id) || null : null;
  const voteCounts = options.reduce<Record<string, number>>((acc, option) => {
    acc[option.id] = votes.filter((v) => v.option_id === option.id).length;
    return acc;
  }, {});

  return {
    poll,
    options,
    loading,
    drawing,
    createPoll,
    drawWinner,
    castVote,
    finishVote,
    myVote,
    voteCounts,
    totalVotes: votes.length,
    refetch: fetchPoll,
  };
};
