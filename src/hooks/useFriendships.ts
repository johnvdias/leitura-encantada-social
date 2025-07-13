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
      // Fetch friendships first
      const { data: friendshipsRaw, error: friendshipsError } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (friendshipsError) {
        console.error("Friendships fetch error:", friendshipsError);
        throw friendshipsError;
      }

      // Get all unique user IDs to fetch profiles
      const userIds = new Set<string>();
      friendshipsRaw?.forEach((friendship) => {
        userIds.add(friendship.requester_id);
        userIds.add(friendship.addressee_id);
      });

      // Remove current user ID
      userIds.delete(user.id);

      // Fetch profiles for all users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", Array.from(userIds));

      if (profilesError) {
        console.error("Profiles fetch error:", profilesError);
        throw profilesError;
      }

      // Create a map of profiles by user_id
      const profilesMap = new Map();
      profiles?.forEach((profile) => {
        profilesMap.set(profile.user_id, profile);
      });

      // Combine friendships with profile data
      const enrichedFriendships =
        friendshipsRaw?.map((friendship) => ({
          ...friendship,
          requester: profilesMap.get(friendship.requester_id),
          addressee: profilesMap.get(friendship.addressee_id),
        })) || [];

      // Filter by status and user relationship
      const acceptedFriends = enrichedFriendships.filter(
        (f) =>
          f.status === "accepted" &&
          (f.requester_id === user.id || f.addressee_id === user.id),
      );

      const pendingRequests = enrichedFriendships.filter(
        (f) => f.status === "pending" && f.addressee_id === user.id,
      );

      const sentRequests = enrichedFriendships.filter(
        (f) => f.status === "pending" && f.requester_id === user.id,
      );

      setFriends(acceptedFriends);
      setFriendRequests(pendingRequests);
      setSentRequests(sentRequests);
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
        status: "pending",
      });

      if (error) {
        console.error("Insert friendship error:", error);
        throw error;
      }

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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast({
        title: "Erro",
        description: `Erro ao enviar solicitação: ${errorMessage}`,
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
