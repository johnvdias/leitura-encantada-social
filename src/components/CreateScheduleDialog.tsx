import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Loader2, FileText, ListOrdered } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFriendships } from "@/hooks/useFriendships";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";

type GoalUnit = "pages" | "chapters";

interface BookOption {
  id: string;
  title: string;
  author: string;
  reading_status: string;
  pages: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  reading: "Lendo",
  completed: "Lido",
  want_to_read: "Quero Ler",
};

const UNIT_LABEL: Record<GoalUnit, string> = {
  pages: "páginas",
  chapters: "capítulos",
};

interface CreateScheduleDialogProps {
    onScheduleCreated: () => void;
}

export function CreateScheduleDialog({ onScheduleCreated }: CreateScheduleDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { friends } = useFriendships();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userBooks, setUserBooks] = useState<BookOption[]>([]);
  const [bookSearch, setBookSearch] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [bookId, setBookId] = useState("");
  const [unit, setUnit] = useState<GoalUnit>("pages");
  const [total, setTotal] = useState("");
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [endDate, setEndDate] = useState(startOfDay(new Date(new Date().setDate(new Date().getDate() + 7))));

  useEffect(() => {
    const fetchUserBooks = async () => {
      if (!user || !open) return;
      const { data, error } = await supabase
        .from('books')
        .select('id, title, author, reading_status, pages')
        .eq('user_id', user.id)
        .order('title');
      if (error) console.error("Error fetching user books:", error);
      else setUserBooks(data || []);
    };
    fetchUserBooks();
  }, [user, open]);

  // Reabre o formulário limpo a cada vez que o diálogo é aberto.
  useEffect(() => {
    if (!open) return;
    setBookId("");
    setUnit("pages");
    setTotal("");
    setStartDate(startOfDay(new Date()));
    setEndDate(startOfDay(new Date(new Date().setDate(new Date().getDate() + 7))));
    setSelectedFriends([]);
    setBookSearch("");
  }, [open]);

  const selectedBook = userBooks.find((b) => b.id === bookId);

  // Pré-preenche o total com as páginas do livro quando ele muda e o campo
  // ainda está vazio - só faz sentido pra unidade "páginas".
  useEffect(() => {
    if (unit === "pages" && selectedBook?.pages && !total) {
      setTotal(String(selectedBook.pages));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const handleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const totalQuantity = parseInt(total, 10) || 0;
  const totalDays = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
  const dailyTarget = totalQuantity > 0 ? Math.ceil(totalQuantity / totalDays) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bookId) {
        toast({ title: "Campo obrigatório", description: "Escolha um livro.", variant: "destructive"});
        return;
    }
    if (totalQuantity <= 0) {
        toast({ title: "Campo obrigatório", description: `Informe a quantidade total de ${UNIT_LABEL[unit]}.`, variant: "destructive" });
        return;
    }
    if (endDate < startDate) {
        toast({ title: "Datas inválidas", description: "A data de término precisa ser depois da data de início.", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
      const { data: schedule, error: scheduleError } = await supabase
        .from('group_reading_schedules')
        .insert({
          name: `Cronograma: ${selectedBook?.title ?? ''}`,
          book_id: bookId,
          reading_goal: { unit, total: totalQuantity, daily_target: dailyTarget },
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          creator_id: user.id,
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      const participants = [
        { schedule_id: schedule.id, user_id: user.id, status: 'accepted' },
        ...selectedFriends.map(friendId => ({
          schedule_id: schedule.id,
          user_id: friendId,
          status: 'pending'
        }))
      ];

      const { error: participantsError } = await supabase
        .from('schedule_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      toast({
        title: "Cronograma Criado! 🗓️",
        description: `Meta diária: ${dailyTarget} ${UNIT_LABEL[unit]}/dia até ${format(endDate, "dd/MM", { locale: ptBR })}.`,
      });
      setOpen(false);
      onScheduleCreated();

    } catch (error) {
      console.error('Error creating schedule:', error);
      toast({ title: "Erro", description: "Não foi possível criar o cronograma.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalendarIcon className="h-4 w-4 mr-2" />
          Criar Cronograma
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Cronograma de Leitura</DialogTitle>
          <DialogDescription>
            Escolha um livro, defina a meta e convide amigos para lerem juntos. O app calcula a meta diária sozinho.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Livro</Label>
            <Input
              placeholder="Buscar por título ou autora..."
              value={bookSearch}
              onChange={(e) => setBookSearch(e.target.value)}
              className="mb-2"
            />
            <Select value={bookId || undefined} onValueChange={setBookId} required>
              <SelectTrigger><SelectValue placeholder="Selecione um livro da sua estante..." /></SelectTrigger>
              <SelectContent>
                {userBooks
                  .filter(book =>
                    !bookSearch.trim() ||
                    book.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
                    book.author?.toLowerCase().includes(bookSearch.toLowerCase())
                  )
                  .map(book => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.title} — {book.author} ({STATUS_LABEL[book.reading_status] || book.reading_status})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>O cronograma vai ser contado em</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUnit("pages")}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors",
                  unit === "pages" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                )}
              >
                <FileText className="h-5 w-5" />
                Páginas
              </button>
              <button
                type="button"
                onClick={() => setUnit("chapters")}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors",
                  unit === "chapters" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                )}
              >
                <ListOrdered className="h-5 w-5" />
                Capítulos
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total">Total de {UNIT_LABEL[unit]}</Label>
            <Input
              id="total"
              type="number"
              min={1}
              placeholder={unit === "pages" ? "Ex: 320" : "Ex: 24"}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Data de início</Label>
              <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "dd/MM/yy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(startOfDay(date))}
                      disabled={(date) => date < startOfDay(new Date())}
                    />
                  </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data de término</Label>
              <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, "dd/MM/yy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(startOfDay(date))}
                      disabled={(date) => date < startDate}
                    />
                  </PopoverContent>
              </Popover>
            </div>
          </div>

          {totalQuantity > 0 && (
            <p className="text-sm text-muted-foreground text-center bg-muted rounded-md py-2">
              Meta diária calculada: <span className="font-semibold text-foreground">{dailyTarget} {UNIT_LABEL[unit]}/dia</span> ({totalDays} {totalDays === 1 ? 'dia' : 'dias'})
            </p>
          )}

          <div className="space-y-2">
            <Label>Convidar Amigos</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto border p-2 rounded-md">
              {friends.length > 0 ? friends.map(friend => (
                <div key={friend.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`friend-${friend.friend.user_id}`}
                    onCheckedChange={() => handleFriendSelection(friend.friend.user_id)}
                    checked={selectedFriends.includes(friend.friend.user_id)}
                  />
                  <Label htmlFor={`friend-${friend.friend.user_id}`} className="font-normal">{friend.friend.display_name || friend.friend.username}</Label>
                </div>
              )) : <p className="text-xs text-muted-foreground text-center">Nenhum amigo para convidar.</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
