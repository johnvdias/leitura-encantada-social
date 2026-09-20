import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Vote, Loader2 } from "lucide-react";
import { useClubBookPoll } from "@/hooks/useClubBookPoll";
import { CreatePollDialog } from "@/components/CreatePollDialog";

interface ClubBookPollSectionProps {
  clubId: string;
  isCreator: boolean;
  onResolved?: () => void;
}

export function ClubBookPollSection({ clubId, isCreator, onResolved }: ClubBookPollSectionProps) {
  const { poll, options, loading, closing, createPoll, castVote, closePoll } = useClubBookPoll(
    clubId,
    isCreator,
    onResolved
  );

  if (loading) {
    return <p className="text-center text-muted-foreground py-6">Carregando votação...</p>;
  }

  if (!poll) {
    return (
      <Card className="text-center py-10">
        <CardContent className="space-y-4">
          <Vote className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">Nenhuma votação em andamento.</p>
          {isCreator && <CreatePollDialog onCreate={createPoll} />}
        </CardContent>
      </Card>
    );
  }

  const totalVotes = options.reduce((sum, o) => sum + o.voteCount, 0);
  const isOpen = poll.status === 'open';
  const winner = !isOpen ? [...options].sort((a, b) => b.voteCount - a.voteCount)[0] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isOpen ? 'Votação do próximo livro' : 'Votação encerrada'}</CardTitle>
        <CardDescription>
          {isOpen
            ? 'Escolha entre as opções propostas'
            : winner
              ? `Resultado: "${winner.title}" foi a mais votada`
              : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {options.map((option) => {
          const pct = totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0;
          return (
            <div key={option.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{option.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{option.author}</p>
                </div>
                {isOpen ? (
                  <Button
                    size="sm"
                    variant={option.votedByMe ? 'default' : 'outline'}
                    onClick={() => castVote(option.id)}
                    className="shrink-0"
                  >
                    {option.votedByMe && <Check className="h-4 w-4 mr-1" />}
                    {option.votedByMe ? 'Votado' : 'Votar'}
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground shrink-0">{option.voteCount} voto(s)</span>
                )}
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          );
        })}

        <p className="text-xs text-muted-foreground text-right">{totalVotes} voto(s) no total</p>

        {isOpen && isCreator && (
          <Button variant="outline" onClick={closePoll} disabled={closing} className="w-full">
            {closing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Encerrar votação
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
