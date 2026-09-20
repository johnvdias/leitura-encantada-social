import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { BookMarked, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBookLoans } from "@/hooks/useBookLoans";

interface RequestLoanButtonProps {
  bookId: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pedido enviado',
  accepted: 'Emprestado com você',
};

export function RequestLoanButton({ bookId }: RequestLoanButtonProps) {
  const { user } = useAuth();
  const { requestLoan } = useBookLoans();
  const [status, setStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  const checkExistingLoan = useCallback(async () => {
    if (!user) return;
    setChecking(true);
    try {
      const { data } = await supabase
        .from('book_loans')
        .select('status')
        .eq('book_id', bookId)
        .eq('borrower_id', user.id)
        .in('status', ['pending', 'accepted'])
        .maybeSingle();
      setStatus(data?.status ?? null);
    } finally {
      setChecking(false);
    }
  }, [bookId, user]);

  useEffect(() => {
    checkExistingLoan();
  }, [checkExistingLoan]);

  const handleRequest = async () => {
    setLoading(true);
    try {
      await requestLoan(bookId);
      setStatus('pending');
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  if (status) {
    return (
      <Button variant="outline" size="sm" disabled className="mt-2 w-full">
        <BookMarked className="h-4 w-4 mr-2" />
        {STATUS_LABEL[status] || status}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleRequest} disabled={loading} className="mt-2 w-full">
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BookMarked className="h-4 w-4 mr-2" />}
      Pedir emprestado
    </Button>
  );
}
