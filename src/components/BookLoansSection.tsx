import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BookMarked, Check, X, Undo2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBookLoans, BookLoan } from "@/hooks/useBookLoans";

const LoanRow = ({ loan, person }: { loan: BookLoan; person: { display_name: string | null; avatar_url: string | null } | null }) => (
  <div className="flex items-center gap-3">
    <img
      src={loan.book_cover_url || '/placeholder.svg'}
      alt={loan.book_title || ''}
      className="h-14 w-10 object-cover rounded shrink-0"
    />
    <Avatar className="h-8 w-8 shrink-0">
      <AvatarImage src={person?.avatar_url || undefined} />
      <AvatarFallback>{person?.display_name?.charAt(0) || '?'}</AvatarFallback>
    </Avatar>
    <div className="min-w-0 flex-1">
      <p className="font-medium truncate">{loan.book_title}</p>
      <p className="text-sm text-muted-foreground truncate">{person?.display_name || 'Usuária'}</p>
    </div>
  </div>
);

export const BookLoansSection = () => {
  const { user } = useAuth();
  const { loans, loading, respondToLoan, cancelLoan, markReturned } = useBookLoans();

  if (loading) {
    return <p className="text-muted-foreground text-sm">Carregando empréstimos...</p>;
  }

  const receivedRequests = loans.filter((l) => l.owner_id === user?.id && l.status === 'pending');
  const sentRequests = loans.filter((l) => l.borrower_id === user?.id && l.status === 'pending');
  const activeLoans = loans.filter((l) => l.status === 'accepted');
  const history = loans
    .filter((l) => ['returned', 'declined', 'cancelled'].includes(l.status))
    .slice(0, 10);

  const statusLabel: Record<string, string> = {
    returned: 'Devolvido',
    declined: 'Recusado',
    cancelled: 'Cancelado',
  };

  if (
    receivedRequests.length === 0 &&
    sentRequests.length === 0 &&
    activeLoans.length === 0 &&
    history.length === 0
  ) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <BookMarked className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">Nenhum empréstimo por aqui</h3>
          <p className="text-muted-foreground">
            Peça um livro emprestado na estante de uma amiga para começar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {receivedRequests.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pedidos recebidos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {receivedRequests.map((loan) => (
              <div key={loan.id} className="flex items-center justify-between gap-3">
                <LoanRow loan={loan} person={loan.borrower} />
                <div className="flex gap-2 shrink-0">
                  <Button size="icon" variant="outline" onClick={() => respondToLoan(loan.id, true)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => respondToLoan(loan.id, false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {sentRequests.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Meus pedidos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {sentRequests.map((loan) => (
              <div key={loan.id} className="flex items-center justify-between gap-3">
                <LoanRow loan={loan} person={loan.owner} />
                <Button size="sm" variant="outline" onClick={() => cancelLoan(loan.id)} className="shrink-0">
                  Cancelar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeLoans.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Empréstimos ativos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {activeLoans.map((loan) => (
              <div key={loan.id} className="flex items-center justify-between gap-3">
                <LoanRow loan={loan} person={loan.owner_id === user?.id ? loan.borrower : loan.owner} />
                <Button size="sm" variant="outline" onClick={() => markReturned(loan.id)} className="shrink-0">
                  <Undo2 className="h-4 w-4 mr-2" />
                  Devolvido
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {history.map((loan) => (
              <div key={loan.id} className="flex items-center justify-between gap-3">
                <LoanRow loan={loan} person={loan.owner_id === user?.id ? loan.borrower : loan.owner} />
                <Badge variant="outline" className="shrink-0">{statusLabel[loan.status] || loan.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
