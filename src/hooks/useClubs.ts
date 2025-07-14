import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useClubs = () => {
  const [clubs, setClubs] = useState<any[]>([]);
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchClubs = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch all clubs with current book info and member count
      const { data: clubsData, error: clubsError } = await supabase
        .from("clubs")
        .select(
          `
          *,
          books (
            title,
            author
          ),
          club_members (
            user_id
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (clubsError) throw clubsError;

      // Fetch user's club memberships
      const { data: membershipsData, error: membershipsError } = await supabase
        .from("club_members")
        .select("club_id")
        .eq("user_id", user.id);

      if (membershipsError) throw membershipsError;

      // Fetch creator profiles separately
      const creatorIds = clubsData?.map((club) => club.creator_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", creatorIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        // Continue without profile data if profiles table doesn't exist
      }

      const memberClubIds = new Set(
        membershipsData?.map((m) => m.club_id) || [],
      );
      const profilesMap = new Map(
        profilesData?.map((p) => [p.user_id, p.display_name]) || [],
      );

      const processedClubs = (clubsData || []).map((club) => ({
        ...club,
        memberCount: club.club_members?.length || 0,
        isJoined: memberClubIds.has(club.id),
        moderator: profilesMap.get(club.creator_id) || "Moderador",
      }));

      setClubs(processedClubs);
      setMyClubs(processedClubs.filter((club) => club.isJoined));
    } catch (error) {
      console.error("Error fetching clubs:", error);
    } finally {
      setLoading(false);
    }
  };

  const joinClub = async (clubId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("club_members").insert({
        club_id: clubId,
        user_id: user.id,
      });

      if (error) throw error;
      await fetchClubs();
    } catch (error) {
      console.error("Error joining club:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchClubs();
  }, [user]);

  return {
    clubs,
    myClubs,
    loading,
    joinClub,
    refetch: fetchClubs,
  };
};
