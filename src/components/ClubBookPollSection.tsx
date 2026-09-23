import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dices, Loader2 } from "lucide-react";
import { useClubBookPoll } from "@/hooks/useClubBookPoll";
import { CreatePollDialog } from "@/components/CreatePollDialog";

interface ClubBookPollSectionProps {
  clubId: string;
  isCreator: boolean;
  onResolved?: () => void;
}

export function ClubBookPollSection({ clubId, isCreator, onResolved }: ClubBookPollSectionProps) {
  const { poll, options, loading, drawing, createPoll, drawWinner } = useClubBookPoll(
    clubId,
    isCreator,
    onResolved
  );

  if (loading) {
    return <p className="text-center text-muted-foreground py-6">Carregando sorteio...</p>;
  }

  if (!poll) {
    return (
      <Card className="text-center py-10">
        <CardContent className="space-y-4">
          <Dices className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">Nenhum sorteio em andamento.</p>
          {isCreator && <CreatePollDialog onCreate={createPoll} />}
        </CardContent>
      </Card>
    );
  }

  const isOpen = poll.status === 'open';
  const winner = !isOpen ? options.find((o) => o.id === poll.winning_option_id) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isOpen ? 'Sorteio do próximo livro' : 'Sorteio encerrado'}</CardTitle>
        <CardDescription>
          {isOpen
            ? 'Opções propostas - o próximo livro é sorteado entre elas'
            : winner
              ? `Sorteada: "${winner.title}"`
              : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {options.map((option) => (
          <div
            key={option.id}
            className={`flex items-center justify-between gap-2 rounded-md border p-3 ${
              option.id === poll.winning_option_id ? 'border-primary bg-primary/5' : ''
            }`}
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{option.title}</p>
              <p className="text-xs text-muted-foreground truncate">{option.author}</p>
            </div>
            {option.id === poll.winning_option_id && (
              <span className="text-xs font-medium text-primary shrink-0">Sorteada 🎉</span>
            )}
          </div>
        ))}

        {isOpen && isCreator && (
          <Button variant="outline" onClick={drawWinner} disabled={drawing} className="w-full">
            {drawing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Dices className="h-4 w-4 mr-2" />}
            Sortear próximo livro
          </Button>
        )}

        {!isOpen && isCreator && (
          <div className="pt-2">
            <CreatePollDialog onCreate={createPoll} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
