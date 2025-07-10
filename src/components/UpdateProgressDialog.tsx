import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock } from "lucide-react";

interface UpdateProgressDialogProps {
  bookId: string;
  title: string;
  currentPage: number;
  totalPages: number;
  currentProgress: number;
  onProgressUpdate: () => void;
  children: React.ReactNode;
}

export function UpdateProgressDialog({
  bookId,
  title,
  currentPage,
  totalPages,
  currentProgress,
  onProgressUpdate,
  children,
}: UpdateProgressDialogProps) {
  const [newPage, setNewPage] = useState(currentPage);
  const [readingMinutes, setReadingMinutes] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const newProgress = totalPages > 0 ? Math.round((newPage / totalPages) * 100) : 0;
  const pagesRead = newPage - currentPage;

  const handleUpdateProgress = async () => {
    if (newPage < currentPage) {
      toast({
        title: "Erro",
        description: "A nova página não pode ser menor que a página atual.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Update book progress
      const { error: bookError } = await supabase
        .from("books")
        .update({
          current_page: newPage,
          reading_progress: newProgress,
          last_read_at: new Date().toISOString(),
          reading_status: newProgress >= 100 ? "completed" : "reading",
        })
        .eq("id", bookId);

      if (bookError) throw bookError;

      // Create reading history entry
      const { error: historyError } = await supabase
        .from("reading_history")
        .insert({
          book_id: bookId,
          user_id: user.id,
          previous_progress: currentProgress,
          new_progress: newProgress,
          pages_read: pagesRead,
          reading_session_minutes: readingMinutes || null,
          notes: notes || null,
        });

      if (historyError) throw historyError;

      toast({
        title: "Progresso atualizado!",
        description: newProgress >= 100 
          ? `Parabéns! Você concluiu "${title}"! 🎉`
          : `Você leu ${pagesRead} páginas. Continue assim! 📚`,
      });

      setOpen(false);
      onProgressUpdate();
      
      // Reset form
      setNotes("");
      setReadingMinutes(0);
    } catch (error) {
      console.error("Error updating progress:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o progresso. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Atualizar Progresso
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Livro</Label>
            <p className="font-medium truncate">{title}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="page">Página atual</Label>
            <div className="flex items-center gap-2">
              <Input
                id="page"
                type="number"
                min={currentPage}
                max={totalPages}
                value={newPage}
                onChange={(e) => setNewPage(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">/ {totalPages}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Progresso</Label>
            <div className="space-y-1">
              <Progress value={newProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{pagesRead > 0 ? `+${pagesRead} páginas` : "Nenhuma página nova"}</span>
                <span>{newProgress}%</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minutes" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Tempo de leitura (minutos)
            </Label>
            <Input
              id="minutes"
              type="number"
              min={0}
              value={readingMinutes}
              onChange={(e) => setReadingMinutes(Number(e.target.value))}
              placeholder="Opcional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Anotações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Como foi a sessão de leitura? (opcional)"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateProgress}
              disabled={isLoading || newPage < currentPage}
              className="flex-1"
            >
              {isLoading ? "Salvando..." : "Salvar Progresso"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}