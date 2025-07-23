import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/integrations/supabase/types";

type Friendship = Tables<'friendships'>;

type ProfileData = {
  display_name: string | null;
  avatar_url: string | null;
  user_id: string;
} | null;

type Friend = Friendship & {
  requester: ProfileData;
  addressee: ProfileData;
  friend: ProfileData;
};

type FriendRequest = Friendship & {
  requester: ProfileData;
};

export const useFriends = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchFriends = useCallback(async () => {
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
  }, [user]);

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
  }, [fetchFriends]);

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