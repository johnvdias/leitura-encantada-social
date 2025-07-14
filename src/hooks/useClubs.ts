import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useClubs = () => {
  const [clubs, setClubs] = useState<any[]>([]);
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

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

  const deleteClub = async (clubId: string) => {
    if (!user) return;

    try {
      // Verificar se o usuário é o criador do clube
      const { data: club, error: fetchError } = await supabase
        .from("clubs")
        .select("creator_id")
        .eq("id", clubId)
        .single();

      if (fetchError) throw fetchError;

      if (club.creator_id !== user.id) {
        toast({
          title: "Erro",
          description: "Apenas o criador pode deletar o clube",
          variant: "destructive",
        });
        return;
      }

      // Deletar membros do clube primeiro (devido às foreign keys)
      const { error: membersError } = await supabase
        .from("club_members")
        .delete()
        .eq("club_id", clubId);

      if (membersError) throw membersError;

      // Deletar o clube
      const { error } = await supabase.from("clubs").delete().eq("id", clubId);

      if (error) throw error;

      toast({
        title: "Clube deletado",
        description: "O clube foi removido com sucesso",
      });

      await fetchClubs();
    } catch (error) {
      console.error("Error deleting club:", error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar o clube",
        variant: "destructive",
      });
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
    deleteClub,
    refetch: fetchClubs,
  };
};
