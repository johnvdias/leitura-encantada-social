
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useClubs = () => {
  const [clubs, setClubs] = useState<any[]>([]);
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchClubs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch all clubs
      const { data: clubsData, error: clubsError } = await supabase
        .from('clubs')
        .select(`
          *,
          profiles!clubs_creator_id_fkey (
            display_name
          ),
          books (
            title,
            author
          ),
          club_members (
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (clubsError) throw clubsError;

      // Fetch user's club memberships
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', user.id);

      if (membershipsError) throw membershipsError;

      const memberClubIds = new Set(membershipsData?.map(m => m.club_id) || []);
      
      const processedClubs = (clubsData || []).map(club => ({
        ...club,
        memberCount: club.club_members?.length || 0,
        isJoined: memberClubIds.has(club.id),
        moderator: club.profiles?.display_name || "Moderador"
      }));

      setClubs(processedClubs);
      setMyClubs(processedClubs.filter(club => club.isJoined));
      
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinClub = async (clubId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('club_members')
        .insert({
          club_id: clubId,
          user_id: user.id
        });

      if (error) throw error;
      await fetchClubs();
    } catch (error) {
      console.error('Error joining club:', error);
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
    refetch: fetchClubs
  };
};
