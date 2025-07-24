import { useState } from "react";
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
import { Calendar as CalendarIcon, Plus, Users, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFriendships } from "@/hooks/useFriendships";
import { format } from "date-fns";

export function CreateChallengeDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { friends } = useFriendships();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    goal_type: "pages",
    goal_value: "",
    start_date: new Date(),
    end_date: new Date(new Date().setDate(new Date().getDate() + 30)),
  });

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // 1. Create the challenge
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
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      // 2. Add creator as a participant
      await supabase.from('challenge_participants').insert({
        challenge_id: challenge.id,
        user_id: user.id,
        status: 'accepted',
        joined_at: new Date().toISOString(),
      });

      // 3. Invite selected friends
      if (selectedFriends.length > 0) {
        const invitations = selectedFriends.map((friendId) => ({
          challenge_id: challenge.id,
          user_id: friendId,
          status: 'invited',
        }));
        await supabase.from('challenge_participants').insert(invitations);
      }
      
      setOpen(false);
      // Reset form state if needed
      toast({
        title: "Desafio Criado! 🏆",
        description: "Seu desafio foi criado e os convites foram enviados.",
      });
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
            <Label htmlFor="name">Nome do Desafio</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="goal_type">Meta</Label>
              <Select value={formData.goal_type} onValueChange={(value) => setFormData({...formData, goal_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de meta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pages">Páginas Lidas</SelectItem>
                  <SelectItem value="books">Livros Concluídos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal_value">Valor da Meta</Label>
              <Input id="goal_value" type="number" value={formData.goal_value} onChange={(e) => setFormData({...formData, goal_value: e.target.value})} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{format(formData.start_date, "PPP")}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.start_date} onSelect={(d) => d && setFormData({...formData, start_date: d})} initialFocus /></PopoverContent>
              </Popover>
            </div>
             <div className="grid gap-2">
              <Label>Data de Término</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{format(formData.end_date, "PPP")}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.end_date} onSelect={(d) => d && setFormData({...formData, end_date: d})} initialFocus /></PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Convidar Amigos</Label>
            <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
              {friends.map(friendship => (
                <div key={friendship.friend.user_id} className="flex items-center justify-between">
                  <span>{friendship.friend.display_name}</span>
                  <Button type="button" size="sm" variant={selectedFriends.includes(friendship.friend.user_id) ? "default" : "outline"} onClick={() => handleFriendToggle(friendship.friend.user_id)}>
                    {selectedFriends.includes(friendship.friend.user_id) ? "Convidado" : "Convidar"}
                  </Button>
                </div>
              ))}
              {friends.length === 0 && <p className="text-sm text-muted-foreground text-center">Você não tem amigos para convidar.</p>}
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