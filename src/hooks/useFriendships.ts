
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useFriendships = () => {
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFriendships = async () => {
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

      console.log('Todas as amizades encontradas:', allFriendships);

      if (!allFriendships || allFriendships.length === 0) {
        setFriends([]);
        setFriendRequests([]);
        setSentRequests([]);
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
        .select('user_id, display_name, avatar_url')
        .in('user_id', Array.from(userIds));

      if (profilesError) throw profilesError;

      console.log('Perfis encontrados:', profiles);

      // Criar um mapa de perfis para acesso rápido
      const profilesMap = new Map();
      profiles?.forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });

      // Group friendships by the other user's ID to handle bidirectional relationships
      const friendshipsByUser = new Map<string, any[]>();
      
      allFriendships?.forEach(friendship => {
        const otherUserId = friendship.requester_id === user.id 
          ? friendship.addressee_id 
          : friendship.requester_id;
        
        if (!friendshipsByUser.has(otherUserId)) {
          friendshipsByUser.set(otherUserId, []);
        }
        friendshipsByUser.get(otherUserId)!.push(friendship);
      });

      console.log('Amizades agrupadas por usuário:', friendshipsByUser);

      const friends: any[] = [];
      const friendRequests: any[] = [];
      const sentRequests: any[] = [];

      friendshipsByUser.forEach((userFriendships, otherUserId) => {
        const otherUserProfile = profilesMap.get(otherUserId);
        
        if (!otherUserProfile) {
          console.warn(`Perfil não encontrado para usuário ${otherUserId}`);
          return;
        }

        // Check if there's any accepted friendship
        const acceptedFriendship = userFriendships.find(f => f.status === 'accepted');
        
        if (acceptedFriendship) {
          // Transform to show the friend profile
          friends.push({
            ...acceptedFriendship,
            friend: otherUserProfile
          });
        } else {
          // Check for pending requests
          const pendingRequests = userFriendships.filter(f => f.status === 'pending');
          
          pendingRequests.forEach(friendship => {
            if (friendship.addressee_id === user.id) {
              // Request received - adicionar perfil do requester
              friendRequests.push({
                ...friendship,
                requester: profilesMap.get(friendship.requester_id)
              });
            } else if (friendship.requester_id === user.id) {
              // Request sent - adicionar perfil do addressee
              sentRequests.push({
                ...friendship,
                addressee: profilesMap.get(friendship.addressee_id)
              });
            }
          });
        }
      });

      console.log('Amigos finais:', friends);
      console.log('Solicitações recebidas:', friendRequests);
      console.log('Solicitações enviadas:', sentRequests);

      setFriends(friends);
      setFriendRequests(friendRequests);
      setSentRequests(sentRequests);
    } catch (error) {
      console.error('Error fetching friendships:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (addresseeId: string) => {
    if (!user) return;

    try {
      console.log('Enviando solicitação de amizade para:', addresseeId);
      
      // Verificar se já existe uma solicitação enviada pelo usuário atual
      const { data: sentRequest, error: sentError } = await supabase
        .from('friendships')
        .select('id, status')
        .eq('requester_id', user.id)
        .eq('addressee_id', addresseeId)
        .maybeSingle();

      if (sentError) {
        console.error('Erro ao verificar solicitação enviada:', sentError);
        throw sentError;
      }

      if (sentRequest) {
        console.log('Solicitação existente encontrada:', sentRequest);
        if (sentRequest.status === 'pending') {
          toast({
            title: "Solicitação já enviada",
            description: "Você já enviou uma solicitação para esta pessoa",
            variant: "destructive"
          });
          return;
        } else if (sentRequest.status === 'accepted') {
          toast({
            title: "Já são amigos",
            description: "Vocês já são amigos!",
            variant: "destructive"
          });
          return;
        } else if (sentRequest.status === 'rejected') {
          // Se foi rejeitada, deletar a solicitação antiga para permitir nova
          console.log('Deletando solicitação rejeitada para permitir nova');
          await supabase
            .from('friendships')
            .delete()
            .eq('id', sentRequest.id);
        }
      }

      // Verificar se já existe uma solicitação recebida do destinatário
      const { data: receivedRequest, error: receivedError } = await supabase
        .from('friendships')
        .select('id, status')
        .eq('requester_id', addresseeId)
        .eq('addressee_id', user.id)
        .maybeSingle();

      if (receivedError) {
        console.error('Erro ao verificar solicitação recebida:', receivedError);
        throw receivedError;
      }

      if (receivedRequest) {
        console.log('Solicitação recebida encontrada:', receivedRequest);
        if (receivedRequest.status === 'pending') {
          toast({
            title: "Solicitação pendente",
            description: "Esta pessoa já enviou uma solicitação para você. Verifique suas solicitações recebidas.",
            variant: "destructive"
          });
          return;
        } else if (receivedRequest.status === 'accepted') {
          toast({
            title: "Já são amigos",
            description: "Vocês já são amigos!",
            variant: "destructive"
          });
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
          related_id: user?.id
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
        .update({ status: 'rejected' })
        .eq('id', friendshipId);

      if (error) throw error;

      await fetchFriendships();
      toast({
        title: "Solicitação rejeitada",
        description: "A solicitação foi rejeitada"
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
  }, [user]);

  return {
    friends,
    friendRequests,
    sentRequests,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    refetch: fetchFriendships
  };
};
