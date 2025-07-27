import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Calendar as CalendarIcon, Loader2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFriendships } from "@/hooks/useFriendships";
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale';

interface BookOption {
  id: string;
  title: string;
}

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
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    book_id: "",
    reading_goal: "",
    due_date: new Date(new Date().setDate(new Date().getDate() + 7)),
  });

  useEffect(() => {
    const fetchUserBooks = async () => {
      if (!user || !open) return;
      const { data, error } = await supabase
        .from('books')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('reading_status', 'want_to_read'); // Only books you want to read
      if (error) console.error("Error fetching user books:", error);
      else setUserBooks(data || []);
    };
    fetchUserBooks();
  }, [user, open]);

  const handleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.book_id || !formData.reading_goal) {
        toast({ title: "Campos obrigatórios", description: "Por favor, preencha todos os campos.", variant: "destructive"});
        return;
    };

    setLoading(true);
    try {
      const { data: schedule, error: scheduleError } = await supabase
        .from('group_reading_schedules')
        .insert({
          name: formData.name,
          book_id: formData.book_id,
          reading_goal: formData.reading_goal,
          due_date: formData.due_date.toISOString(),
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
        description: "Seu cronograma de leitura em grupo foi criado e os convites enviados.",
      });
      setOpen(false);
      onScheduleCreated();
      // Reset form
      setFormData({ name: "", book_id: "", reading_goal: "", due_date: new Date(new Date().setDate(new Date().getDate() + 7)) });
      setSelectedFriends([]);

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
            Escolha um livro, defina uma meta e convide amigos para lerem juntos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Cronograma</Label>
            <Input id="name" placeholder="Ex: Leitura de Fim de Semana" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>

          <div className="space-y-2">
            <Label>Livro</Label>
            <Select onValueChange={(value) => setFormData({...formData, book_id: value})} required>
              <SelectTrigger><SelectValue placeholder="Selecione um livro da sua estante..." /></SelectTrigger>
              <SelectContent>
                {userBooks.map(book => (
                  <SelectItem key={book.id} value={book.id}>{book.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reading_goal">Meta de Leitura</Label>
            <Input id="reading_goal" placeholder="Ex: Ler até o capítulo 10" value={formData.reading_goal} onChange={(e) => setFormData({...formData, reading_goal: e.target.value})} required />
          </div>

          <div className="space-y-2">
            <Label>Data Limite</Label>
            <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.due_date, "PPP", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.due_date} onSelect={(date) => date && setFormData({ ...formData, due_date: date })} /></PopoverContent>
            </Popover>
          </div>

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
