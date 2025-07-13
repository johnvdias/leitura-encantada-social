import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFriends = () => {
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchFriends = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Buscar amigos aceitos
      const { data: friendsData, error: friendsError } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!friendships_requester_id_fkey(display_name, avatar_url, user_id),
          addressee:profiles!friendships_addressee_id_fkey(display_name, avatar_url, user_id)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (friendsError) throw friendsError;

      // Transformar dados para mostrar o amigo (não o próprio usuário)
      const transformedFriends = friendsData?.map(friendship => {
        const isRequester = friendship.requester_id === user.id;
        return {
          ...friendship,
          friend: isRequester ? friendship.addressee : friendship.requester
        };
      }) || [];

      setFriends(transformedFriends);

      // Buscar solicitações pendentes recebidas
      const { data: requestsData, error: requestsError } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!friendships_requester_id_fkey(display_name, avatar_url, user_id)
        `)
        .eq('status', 'pending')
        .eq('addressee_id', user.id);

      if (requestsError) throw requestsError;

      setFriendRequests(requestsData || []);
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (addresseeId: string) => {
    if (!user) return { error: new Error("No user logged in") };

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: 'pending'
      });

    if (!error) {
      await fetchFriends();
    }

    return { error };
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (!error) {
      await fetchFriends();
    }

    return { error };
  };

  const rejectFriendRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (!error) {
      await fetchFriends();
    }

    return { error };
  };

  useEffect(() => {
    fetchFriends();
  }, [user]);

  return {
    friends,
    friendRequests,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    refetch: fetchFriends
  };
};