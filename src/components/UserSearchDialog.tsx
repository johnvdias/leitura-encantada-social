import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useFriendships } from "@/hooks/useFriendships";

interface UserSearchDialogProps {
  children: React.ReactNode;
}

export function UserSearchDialog({ children }: UserSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { friends, friendRequests, sentRequests, sendFriendRequest } = useFriendships();

  const searchUsers = async () => {
    if (!searchQuery.trim() || !user) return;

    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, bio')
        .ilike('display_name', `%${searchQuery}%`)
        .neq('user_id', user.id)
        .limit(10);

      if (error) throw error;

      // Filter out users who are already friends or have pending requests
      const friendIds = new Set(friends.map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      ));
      const pendingIncomingIds = new Set(friendRequests.map(r => r.requester_id));
      const pendingOutgoingIds = new Set(sentRequests.map(r => r.addressee_id));

      const filteredResults = data?.filter(profile => 
        !friendIds.has(profile.user_id) && 
        !pendingIncomingIds.has(profile.user_id) &&
        !pendingOutgoingIds.has(profile.user_id)
      ) || [];

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar usuários",
        variant: "destructive"
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    await sendFriendRequest(userId);
    setSearchResults(prev => prev.filter(user => user.user_id !== userId));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Usuários
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o nome do usuário..."
              onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
            />
            <Button onClick={searchUsers} disabled={searchLoading || !searchQuery.trim()}>
              {searchLoading ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((profile) => (
                <div key={profile.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback>
                        {profile.display_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{profile.display_name}</p>
                      {profile.bio && (
                        <p className="text-sm text-muted-foreground truncate">{profile.bio}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSendRequest(profile.user_id)}
                    className="flex items-center gap-1"
                  >
                    <UserPlus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              ))}
            </div>
          )}

          {searchQuery && searchResults.length === 0 && !searchLoading && (
            <div className="text-center py-4 text-muted-foreground">
              <p>Nenhum usuário encontrado com esse nome.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}