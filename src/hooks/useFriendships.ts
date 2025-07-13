
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
      // Fetch accepted friendships
      const { data: friendsData, error: friendsError } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!inner (display_name, avatar_url, user_id),
          addressee:profiles!inner (display_name, avatar_url, user_id)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (friendsError) throw friendsError;

      // Fetch pending requests received
      const { data: requestsData, error: requestsError } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!inner (display_name, avatar_url, user_id)
        `)
        .eq('addressee_id', user.id)
        .eq('status', 'pending');

      if (requestsError) throw requestsError;

      // Fetch pending requests sent
      const { data: sentData, error: sentError } = await supabase
        .from('friendships')
        .select(`
          *,
          addressee:profiles!inner (display_name, avatar_url, user_id)
        `)
        .eq('requester_id', user.id)
        .eq('status', 'pending');

      if (sentError) throw sentError;

      setFriends(friendsData || []);
      setFriendRequests(requestsData || []);
      setSentRequests(sentData || []);
    } catch (error) {
      console.error('Error fetching friendships:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (addresseeId: string) => {
    if (!user) return;

    try {
      // Verificar se já existe uma amizade ou solicitação pendente
      const { data: existing, error: checkError } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        if (existing.status === 'pending') {
          toast({
            title: "Solicitação já enviada",
            description: "Você já enviou uma solicitação para esta pessoa",
            variant: "destructive"
          });
          return;
        } else if (existing.status === 'accepted') {
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
