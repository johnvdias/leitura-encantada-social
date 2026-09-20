import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

export type BookQuote = Tables<'book_quotes'> & {
  books: { title: string; author: string; cover_url: string | null } | null;
};

export const useBookQuotes = (bookId?: string) => {
  const [quotes, setQuotes] = useState<BookQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchQuotes = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('book_quotes')
        .select('*, books(title, author, cover_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bookId) query = query.eq('book_id', bookId);

      const { data, error } = await query;
      if (error) throw error;
      setQuotes((data as BookQuote[]) || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  }, [user, bookId]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const addQuote = async (content: string, pageNumber?: number, targetBookId?: string) => {
    const finalBookId = targetBookId || bookId;
    if (!user || !finalBookId || !content.trim()) return;

    try {
      const { error } = await supabase.from('book_quotes').insert({
        book_id: finalBookId,
        user_id: user.id,
        content: content.trim(),
        page_number: pageNumber || null,
      });
      if (error) throw error;
      toast({ title: 'Citação salva! ✨' });
      await fetchQuotes();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar a citação.', variant: 'destructive' });
    }
  };

  const removeQuote = async (quoteId: string) => {
    try {
      const { error } = await supabase.from('book_quotes').delete().eq('id', quoteId);
      if (error) throw error;
      await fetchQuotes();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover a citação.', variant: 'destructive' });
    }
  };

  return { quotes, loading, addQuote, removeQuote, refetch: fetchQuotes };
};
