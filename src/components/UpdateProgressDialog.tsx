import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock } from "lucide-react";
import { ReadingStats } from "@/components/ReadingStats";
import { CompletedDatePicker } from "@/components/CompletedDatePicker";
import { format } from "date-fns";

interface UpdateProgressDialogProps {
  bookId: string;
  title: string;
  currentPage: number | null;
  totalPages: number | null;
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
  const safeCurrentPage = currentPage || 0;
  const safeTotalPages = totalPages || 0;
  
  const [newPage, setNewPage] = useState(safeCurrentPage);
  const [readingMinutes, setReadingMinutes] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [completedDate, setCompletedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Reset newPage when dialog opens or when currentPage changes
  useEffect(() => {
    setNewPage(safeCurrentPage);
  }, [safeCurrentPage, open]);

  const newProgress = safeTotalPages > 0 ? Math.round((newPage / safeTotalPages) * 100) : 0;
  const pagesRead = newPage - safeCurrentPage;
  const isCompleting = newProgress >= 100 && currentProgress < 100;

  const handleUpdateProgress = async () => {
    if (safeTotalPages > 0 && newPage > safeTotalPages) {
      toast({
        title: "Erro",
        description: "A página não pode ser maior que o total de páginas do livro.",
        variant: "destructive",
      });
      return;
    }

    if (newPage < 0) {
      toast({
        title: "Erro",
        description: "A página deve ser um número positivo.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Determine new status based on progress
      let newStatus = "reading";
      if (newProgress >= 100) {
        newStatus = "completed";
      } else if (newProgress === 0) {
        newStatus = "want_to_read";
      }

      // Update book progress
      const { error: bookError } = await supabase
        .from("books")
        .update({
          current_page: newPage,
          reading_progress: newProgress,
          last_read_at: new Date().toISOString(),
          reading_status: newStatus,
          ...(isCompleting && {
            completed_at: format(completedDate ?? new Date(), "yyyy-MM-dd"),
          }),
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

      // Show appropriate success message
      let successMessage = `Você leu ${pagesRead} páginas. Continue assim! 📚`;
      
      if (isCompleting) {
        successMessage = `Parabéns! Você concluiu "${title}"! 🎉✨`;
      } else if (newProgress >= 75 && currentProgress < 75) {
        successMessage = `Quase lá! Você está a ${100 - newProgress}% de terminar! 🚀`;
      } else if (newProgress >= 50 && currentProgress < 50) {
        successMessage = `Metade do caminho percorrido! Continue forte! 💪`;
      } else if (newProgress >= 25 && currentProgress < 25) {
        successMessage = `Ótimo progresso! 25% completo! 📖`;
      }

      toast({
        title: isCompleting ? "Livro Concluído!" : "Progresso atualizado!",
        description: successMessage,
      });

      setOpen(false);
      onProgressUpdate();

      // Reset form
      setNotes("");
      setReadingMinutes(0);
      setCompletedDate(null);
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

          {open && <ReadingStats bookId={bookId} />}

          <div className="space-y-2">
            <Label htmlFor="page">Página atual</Label>
            <div className="flex items-center gap-2">
              <Input
                id="page"
                type="number"
                min={0}
                max={safeTotalPages > 0 ? safeTotalPages : undefined}
                value={newPage === 0 ? "" : newPage}
                onChange={(e) => setNewPage(e.target.value === "" ? 0 : Number(e.target.value))}
                className="flex-1"
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground">
                / {safeTotalPages > 0 ? safeTotalPages : '---'}
              </span>
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
              {isCompleting && (
                <div className="text-center text-sm font-medium text-green-600 dark:text-green-400">
                  🎉 Você está prestes a concluir este livro!
                </div>
              )}
            </div>
          </div>

          {isCompleting && (
            <CompletedDatePicker value={completedDate} onChange={setCompletedDate} />
          )}

          <div className="space-y-2">
            <Label htmlFor="minutes" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Tempo de leitura (minutos)
            </Label>
            <Input
              id="minutes"
              type="number"
              min={0}
              value={readingMinutes === 0 ? "" : readingMinutes}
              onChange={(e) => setReadingMinutes(e.target.value === "" ? 0 : Number(e.target.value))}
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
              disabled={isLoading || newPage < 0 || (safeTotalPages > 0 && newPage > safeTotalPages)}
              className="flex-1"
            >
              {isLoading ? "Salvando..." : (isCompleting ? "Concluir Livro!" : "Salvar Progresso")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
