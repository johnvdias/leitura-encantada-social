import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { shouldNotify } from "@/lib/notificationPreferences";

type BookLoanRow = Tables<'book_loans'>;

type LoanProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type BookLoan = BookLoanRow & {
  owner: LoanProfile | null;
  borrower: LoanProfile | null;
};

export const useBookLoans = () => {
  const [loans, setLoans] = useState<BookLoan[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchLoans = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('book_loans')
        .select('*')
        .or(`owner_id.eq.${user.id},borrower_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = data || [];
      const otherUserIds = Array.from(
        new Set(rows.map((row) => (row.owner_id === user.id ? row.borrower_id : row.owner_id)))
      );

      const profilesMap = new Map<string, LoanProfile>();
      if (otherUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', otherUserIds);
        profilesData?.forEach((p) => profilesMap.set(p.user_id, p));
      }

      setLoans(
        rows.map((row) => ({
          ...row,
          owner: profilesMap.get(row.owner_id) || null,
          borrower: profilesMap.get(row.borrower_id) || null,
        }))
      );
    } catch (error) {
      console.error('Error fetching book loans:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const requestLoan = async (bookId: string, message?: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('book_loans')
        .insert({ book_id: bookId, borrower_id: user.id, message: message || null })
        .select('id, owner_id, book_title')
        .single();

      if (error) throw error;

      if (data && (await shouldNotify(data.owner_id, 'loans'))) {
        await supabase.from('notifications').insert({
          user_id: data.owner_id,
          type: 'loan_request',
          title: 'Pedido de empréstimo! 📚',
          content: `Alguém quer pegar "${data.book_title}" emprestado`,
          related_id: data.id,
        });
      }

      toast({ title: 'Pedido enviado!', description: 'Sua solicitação de empréstimo foi enviada.' });
      await fetchLoans();
    } catch (error) {
      const message2 = error instanceof Error ? error.message : 'Não foi possível enviar o pedido.';
      toast({ title: 'Erro', description: message2, variant: 'destructive' });
    }
  };

  const respondToLoan = async (loanId: string, accept: boolean) => {
    try {
      const { data, error } = await supabase
        .from('book_loans')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', loanId)
        .select('id, borrower_id, book_title')
        .single();

      if (error) throw error;

      if (data && (await shouldNotify(data.borrower_id, 'loans'))) {
        await supabase.from('notifications').insert({
          user_id: data.borrower_id,
          type: 'loan_response',
          title: accept ? 'Empréstimo aceito! 🎉' : 'Pedido de empréstimo recusado',
          content: accept
            ? `Seu pedido para pegar "${data.book_title}" emprestado foi aceito`
            : `Seu pedido para pegar "${data.book_title}" emprestado foi recusado`,
          related_id: data.id,
        });
      }

      toast({ title: accept ? 'Empréstimo aceito' : 'Pedido recusado' });
      await fetchLoans();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível responder ao pedido.', variant: 'destructive' });
    }
  };

  const cancelLoan = async (loanId: string) => {
    try {
      const { error } = await supabase.from('book_loans').update({ status: 'cancelled' }).eq('id', loanId);
      if (error) throw error;
      toast({ title: 'Pedido cancelado' });
      await fetchLoans();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível cancelar o pedido.', variant: 'destructive' });
    }
  };

  const markReturned = async (loanId: string) => {
    try {
      const { error } = await supabase.from('book_loans').update({ status: 'returned' }).eq('id', loanId);
      if (error) throw error;
      toast({ title: 'Devolução registrada!' });
      await fetchLoans();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível registrar a devolução.', variant: 'destructive' });
    }
  };

  return {
    loans,
    loading,
    requestLoan,
    respondToLoan,
    cancelLoan,
    markReturned,
    refetch: fetchLoans,
  };
};
