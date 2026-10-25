import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dices, Vote, Loader2, Check } from "lucide-react";
import { useClubBookPoll } from "@/hooks/useClubBookPoll";
import { CreatePollDialog } from "@/components/CreatePollDialog";
import { cn } from "@/lib/utils";

interface ClubBookPollSectionProps {
  clubId: string;
  isCreator: boolean;
  onResolved?: () => void;
}

export function ClubBookPollSection({ clubId, isCreator, onResolved }: ClubBookPollSectionProps) {
  const {
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
    totalVotes,
  } = useClubBookPoll(clubId, isCreator, onResolved);

  if (loading) {
    return <p className="text-center text-muted-foreground py-6">Carregando...</p>;
  }

  if (!poll) {
    return (
      <Card className="text-center py-10">
        <CardContent className="space-y-4">
          <Dices className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">Nenhum sorteio ou votação em andamento.</p>
          {isCreator && <CreatePollDialog onCreate={createPoll} />}
        </CardContent>
      </Card>
    );
  }

  const isOpen = poll.status === 'open';
  const isVoteMode = poll.mode === 'vote';
  const winner = !isOpen ? options.find((o) => o.id === poll.winning_option_id) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isOpen
            ? isVoteMode ? 'Votação do próximo livro' : 'Sorteio do próximo livro'
            : isVoteMode ? 'Votação encerrada' : 'Sorteio encerrado'}
        </CardTitle>
        <CardDescription>
          {isOpen
            ? isVoteMode
              ? 'Vote na opção favorita - quem tiver mais votos será a próxima leitura'
              : 'Opções propostas - o próximo livro é sorteado entre elas'
            : winner
              ? isVoteMode ? `Escolhida: "${winner.title}"` : `Sorteada: "${winner.title}"`
              : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {options.map((option) => {
          const count = voteCounts[option.id] || 0;
          const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = myVote?.option_id === option.id;

          return (
            <div
              key={option.id}
              className={cn(
                "rounded-md border p-3 space-y-2",
                option.id === poll.winning_option_id && "border-primary bg-primary/5"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{option.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{option.author}</p>
                </div>
                {option.id === poll.winning_option_id && (
                  <span className="text-xs font-medium text-primary shrink-0">
                    {isVoteMode ? 'Escolhida 🎉' : 'Sorteada 🎉'}
                  </span>
                )}
                {isVoteMode && isOpen && (
                  <Button
                    size="sm"
                    variant={isMyVote ? "default" : "outline"}
                    onClick={() => castVote(option.id)}
                    className="shrink-0"
                  >
                    {isMyVote && <Check className="h-4 w-4 mr-1" />}
                    {isMyVote ? "Votado" : "Votar"}
                  </Button>
                )}
              </div>

              {isVoteMode && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {count} {count === 1 ? 'voto' : 'votos'}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {isOpen && isCreator && !isVoteMode && (
          <Button variant="outline" onClick={drawWinner} disabled={drawing} className="w-full">
            {drawing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Dices className="h-4 w-4 mr-2" />}
            Sortear próximo livro
          </Button>
        )}

        {isOpen && isCreator && isVoteMode && (
          <Button variant="outline" onClick={finishVote} disabled={drawing} className="w-full">
            {drawing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Vote className="h-4 w-4 mr-2" />}
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
