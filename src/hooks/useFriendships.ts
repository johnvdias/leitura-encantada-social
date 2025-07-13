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
        .from("friendships")
        .select(
          `
          *,
          requester:profiles!inner(display_name, avatar_url, user_id),
          addressee:profiles!inner(display_name, avatar_url, user_id)
        `,
        )
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (friendsError) {
        console.error("Friends error:", friendsError);
        throw friendsError;
      }

      // Fetch pending requests received
      const { data: requestsData, error: requestsError } = await supabase
        .from("friendships")
        .select(
          `
          *,
          requester:profiles!inner(display_name, avatar_url, user_id)
        `,
        )
        .eq("addressee_id", user.id)
        .eq("status", "pending");

      if (requestsError) {
        console.error("Requests error:", requestsError);
        throw requestsError;
      }

      // Fetch pending requests sent
      const { data: sentData, error: sentError } = await supabase
        .from("friendships")
        .select(
          `
          *,
          addressee:profiles!inner(display_name, avatar_url, user_id)
        `,
        )
        .eq("requester_id", user.id)
        .eq("status", "pending");

      if (sentError) {
        console.error("Sent error:", sentError);
        throw sentError;
      }

      setFriends(friendsData || []);
      setFriendRequests(requestsData || []);
      setSentRequests(sentData || []);
    } catch (error) {
      console.error("Error fetching friendships:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast({
        title: "Erro",
        description: `Erro ao carregar amizades: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (addresseeId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("friendships").insert({
        requester_id: user.id,
        addressee_id: addresseeId,
      });

      if (error) throw error;

      // Create notification
      await supabase.from("notifications").insert({
        user_id: addresseeId,
        type: "friend_request",
        title: "Nova solicitação de amizade!",
        content: "Você recebeu uma solicitação de amizade",
        related_id: user.id,
      });

      await fetchFriendships();
      toast({
        title: "Solicitação enviada! 👥",
        description: "Sua solicitação de amizade foi enviada",
      });
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a solicitação",
        variant: "destructive",
      });
    }
  };

  const acceptFriendRequest = async (
    friendshipId: string,
    requesterId: string,
  ) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);

      if (error) throw error;

      // Create notification for requester
      await supabase.from("notifications").insert({
        user_id: requesterId,
        type: "friend_accepted",
        title: "Solicitação aceita! 🎉",
        content: "Sua solicitação de amizade foi aceita",
        related_id: user?.id,
      });

      await fetchFriendships();
      toast({
        title: "Amizade aceita! 🎉",
        description: "Vocês agora são amigos",
      });
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast({
        title: "Erro",
        description: "Não foi possível aceitar a solicitação",
        variant: "destructive",
      });
    }
  };

  const rejectFriendRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "rejected" })
        .eq("id", friendshipId);

      if (error) throw error;

      await fetchFriendships();
      toast({
        title: "Solicitação rejeitada",
        description: "A solicitação foi rejeitada",
      });
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar a solicitação",
        variant: "destructive",
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
    refetch: fetchFriendships,
  };
};
