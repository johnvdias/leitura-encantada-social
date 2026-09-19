
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type Friendship = Tables<'friendships'>;

type ProfileData = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type Friend = Friendship & {
  friend: ProfileData;
};

type FriendRequest = Friendship & {
  requester: ProfileData;
};

type SentRequest = Friendship & {
  addressee: ProfileData;
};

export const useFriendships = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFriendships = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Primeiro, buscar todas as amizades do usuário
      const { data: allFriendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (friendshipsError) throw friendshipsError;

      if (!allFriendships || allFriendships.length === 0) {
        setFriends([]);
        setFriendRequests([]);
        setSentRequests([]);
        setLoading(false);
        return;
      }

      // Coletar todos os IDs únicos de usuários envolvidos
      const userIds = new Set<string>();
      allFriendships.forEach(friendship => {
        userIds.add(friendship.requester_id);
        userIds.add(friendship.addressee_id);
      });
      
      // Remover o próprio usuário da lista
      userIds.delete(user.id);

      // Buscar perfis de todos os usuários envolvidos
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', Array.from(userIds));

      if (profilesError) throw profilesError;

      // Criar um mapa de perfis para acesso rápido
      const profilesMap = new Map<string, ProfileData>();
      profiles?.forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });

      const newFriends: Friend[] = [];
      const newFriendRequests: FriendRequest[] = [];
      const newSentRequests: SentRequest[] = [];

      allFriendships.forEach(friendship => {
        const otherUserId = friendship.requester_id === user.id 
          ? friendship.addressee_id 
          : friendship.requester_id;
        
        const otherUserProfile = profilesMap.get(otherUserId);
        
        if (!otherUserProfile) return;

        if (friendship.status === 'accepted') {
          newFriends.push({
            ...friendship,
            friend: otherUserProfile
          });
        } else if (friendship.status === 'pending') {
          if (friendship.addressee_id === user.id) {
            newFriendRequests.push({
              ...friendship,
              requester: otherUserProfile
            });
          } else {
            newSentRequests.push({
              ...friendship,
              addressee: otherUserProfile
            });
          }
        }
      });

      setFriends(newFriends);
      setFriendRequests(newFriendRequests);
      setSentRequests(newSentRequests);
    } catch (error) {
      console.error('Error fetching friendships:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendFriendRequest = async (addresseeId: string) => {
    if (!user) return;

    try {
      // Verificar se já existe uma relação de amizade
      const { data: existingFriendship, error: existingError } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`)
        .maybeSingle();
      
      if (existingError) throw existingError;

      if(existingFriendship) {
        if(existingFriendship.status === 'accepted') {
          toast({ title: "Já são amigos", description: "Vocês já são amigos!", variant: "destructive" });
          return;
        } else if (existingFriendship.status === 'pending') {
          toast({ title: "Solicitação pendente", description: "Já existe uma solicitação pendente.", variant: "destructive" });
          return;
        }
      }

      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: addresseeId,
          status: 'pending'
        });

      if (error) throw error;

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: addresseeId,
          type: 'friend_request',
          title: 'Nova solicitação de amizade!',
          content: 'Você recebeu uma solicitação de amizade',
          related_id: user.id
        });

      await fetchFriendships();
      toast({
        title: "Solicitação enviada! 👥",
        description: "Sua solicitação de amizade foi enviada"
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a solicitação",
        variant: "destructive"
      });
    }
  };

  const acceptFriendRequest = async (friendshipId: string, requesterId: string) => {
    if(!user) return;
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      // Create notification for requester
      await supabase
        .from('notifications')
        .insert({
          user_id: requesterId,
          type: 'friend_accepted',
          title: 'Solicitação aceita! 🎉',
          content: 'Sua solicitação de amizade foi aceita',
          related_id: user.id
        });

      await fetchFriendships();
      toast({
        title: "Amizade aceita! 🎉",
        description: "Vocês agora são amigos"
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: "Erro",
        description: "Não foi possível aceitar a solicitação",
        variant: "destructive"
      });
    }
  };

  const rejectFriendRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      await fetchFriendships();
      toast({
        title: "Solicitação rejeitada",
      });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar a solicitação",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchFriendships();
  }, [fetchFriendships]);

  const removeFriendship = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      await fetchFriendships();
      
      toast({
        title: "Amizade removida",
        description: "A amizade foi removida com sucesso.",
      });
    } catch (error) {
      console.error("Error removing friendship:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a amizade.",
        variant: "destructive"
      });
    }
  };

  const cancelFriendRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      await fetchFriendships();
      
      toast({
        title: "Solicitação cancelada",
        description: "A solicitação de amizade foi cancelada.",
      });
    } catch (error) {
      console.error("Error canceling friend request:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a solicitação.",
        variant: "destructive"
      });
    }
  };

  return {
    friends,
    friendRequests,
    sentRequests,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriendship,
    cancelFriendRequest,
    refetch: fetchFriendships
  };
};
