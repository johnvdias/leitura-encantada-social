import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Plus, Users, Trophy, Book } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFriendships } from "@/hooks/useFriendships";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

interface BookOption {
  id: string;
  title: string;
}

export function CreateChallengeDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { friends } = useFriendships();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userBooks, setUserBooks] = useState<BookOption[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    goal_type: "pages",
    goal_value: "",
    start_date: new Date(),
    end_date: new Date(new Date().setDate(new Date().getDate() + 30)),
    book_id: null as string | null,
  });

  useEffect(() => {
    const fetchUserBooks = async () => {
      if (!user || !open) return;
      const { data, error } = await supabase
        .from('books')
        .select('id, title')
        .eq('user_id', user.id);
      if (error) console.error("Error fetching user books:", error);
      else setUserBooks(data || []);
    };
    fetchUserBooks();
  }, [user, open]);

  const handleBookSelection = (bookId: string) => {
    const selectedBook = userBooks.find(b => b.id === bookId);
    if (selectedBook) {
      setFormData(prev => ({
        ...prev,
        book_id: bookId,
        name: `Desafio de Leitura: ${selectedBook.title}`,
        goal_type: "completion",
        goal_value: "100",
      }));
    }
  };

  const handleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .insert({
          name: formData.name,
          description: formData.description,
          goal_type: formData.goal_type,
          goal_value: parseInt(formData.goal_value),
          start_date: formData.start_date.toISOString(),
          end_date: formData.end_date.toISOString(),
          creator_id: user.id,
          book_id: formData.book_id,
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      const participants = [
        // Add creator
        { challenge_id: challenge.id, user_id: user.id, status: 'accepted' },
        // Add friends
        ...selectedFriends.map(friendId => ({
          challenge_id: challenge.id,
          user_id: friendId,
          status: 'pending' 
        }))
      ];

      const { error: participantsError } = await supabase
        .from('challenge_participants')
        .insert(participants);

      if (participantsError) throw participantsError;


      toast({
        title: "Desafio Criado! 🏆",
        description: "Seu desafio foi criado e os convites foram enviados.",
      });
      setOpen(false);
      window.location.reload();

    } catch (error) {
      console.error('Error creating challenge:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o desafio.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Trophy className="h-4 w-4 mr-2" />
          Criar Desafio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Desafio</DialogTitle>
          <DialogDescription>
            Defina uma meta, convide seus amigos e comecem uma competição amigável.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Escolha um Livro (Opcional)</Label>
            <Select onValueChange={handleBookSelection}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um livro da sua estante..." />
              </SelectTrigger>
              <SelectContent>
                {userBooks.map(book => (
                  <SelectItem key={book.id} value={book.id}>{book.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Desafio</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required disabled={!!formData.book_id} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="goal_type">Meta</Label>
              <Select value={formData.goal_type} onValueChange={(value) => setFormData({...formData, goal_type: value})} disabled={!!formData.book_id}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pages">Páginas Lidas</SelectItem>
                  <SelectItem value="books">Livros Concluídos</SelectItem>
                  <SelectItem value="completion">Concluir o Livro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal_value">Valor da Meta</Label>
              <Input id="goal_value" type="number" value={formData.goal_value} onChange={(e) => setFormData({...formData, goal_value: e.target.value})} required disabled={!!formData.book_id} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.start_date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.start_date}
                    onSelect={(date) => date && setFormData({ ...formData, start_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.end_date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.end_date}
                    onSelect={(date) => date && setFormData({ ...formData, end_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Convidar Amigos</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto border p-2 rounded-md">
              {friends.map(friend => (
                <div key={friend.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`friend-${friend.friend.user_id}`}
                    onCheckedChange={() => handleFriendSelection(friend.friend.user_id)}
                    checked={selectedFriends.includes(friend.friend.user_id)}
                  />
                  <Label htmlFor={`friend-${friend.friend.user_id}`} className="font-normal">
                    {friend.friend.display_name || friend.friend.username}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar Desafio"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
