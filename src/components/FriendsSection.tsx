
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Check, X } from "lucide-react";
import { useFriendships } from "@/hooks/useFriendships";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function FriendsSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const { friends, friendRequests, sentRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest } = useFriendships();
  const { user } = useAuth();
  const { toast } = useToast();

  const searchUsers = async () => {
    if (!searchQuery.trim() || !user) return;

    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
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

  return (
    <div className="space-y-6">
      {/* Search Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Usuários
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <div className="space-y-2">
              {searchResults.map((profile) => (
                <div key={profile.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback>
                        {profile.display_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{profile.display_name}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => sendFriendRequest(profile.user_id)}
                    className="flex items-center gap-1"
                  >
                    <UserPlus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Friend Requests */}
      {friendRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Solicitações de Amizade</span>
              <Badge variant="secondary">{friendRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {friendRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={request.requester?.avatar_url} />
                    <AvatarFallback>
                      {request.requester?.display_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-medium">{request.requester?.display_name}</span>
                    <p className="text-sm text-muted-foreground">Quer ser seu amigo</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => acceptFriendRequest(request.id, request.requester_id)}
                    className="flex items-center gap-1"
                  >
                    <Check className="h-4 w-4" />
                    Aceitar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectFriendRequest(request.id)}
                    className="flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Recusar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sent Requests */}
      {sentRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Solicitações Enviadas</span>
              <Badge variant="outline">{sentRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sentRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={request.addressee?.avatar_url} />
                    <AvatarFallback>
                      {request.addressee?.display_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-medium">{request.addressee?.display_name}</span>
                    <p className="text-sm text-muted-foreground">Aguardando resposta</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Pendente
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Friends List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Meus Amigos</span>
            <Badge variant="secondary">{friends.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {friends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Você ainda não tem amigos.</p>
              <p className="text-sm">Use a busca acima para encontrar pessoas!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {friends.map((friendship) => {
                const friend = friendship.requester_id === user?.id 
                  ? friendship.addressee 
                  : friendship.requester;
                
                return (
                  <div key={friendship.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend?.avatar_url} />
                      <AvatarFallback>
                        {friend?.display_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{friend?.display_name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
