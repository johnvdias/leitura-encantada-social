import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface StreakPartnership {
  id: string;
  status: 'pending' | 'active' | 'ended';
  partnerId: string;
  partner: { display_name: string | null; avatar_url: string | null } | null;
  isIncomingInvite: boolean;
  isOutgoingInvite: boolean;
  currentStreak: number;
  longestStreak: number;
  freezesAvailable: number;
}

export interface StreakPartnershipProgress {
  user_a_id: string;
  user_b_id: string;
  user_a_pages_today: number;
  user_a_goal: number;
  user_a_met_goal: boolean;
  user_b_pages_today: number;
  user_b_goal: number;
  user_b_met_goal: boolean;
}

export const useStreakPartnerships = () => {
  const [partnerships, setPartnerships] = useState<StreakPartnership[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPartnerships = useCallback(async () => {
    if (!user) {
      setPartnerships([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('streak_partnerships')
        .select('*')
        .in('status', ['pending', 'active'])
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = data || [];

      const partnerIds = Array.from(
        new Set(rows.map((row) => (row.user_a_id === user.id ? row.user_b_id : row.user_a_id)))
      );

      const profilesByUserId = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      if (partnerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', partnerIds);
        profilesData?.forEach((p) => profilesByUserId.set(p.user_id, p));
      }

      setPartnerships(
        rows.map((row) => {
          const partnerId = row.user_a_id === user.id ? row.user_b_id : row.user_a_id;
          return {
            id: row.id,
            status: row.status as StreakPartnership['status'],
            partnerId,
            partner: profilesByUserId.get(partnerId) || null,
            isIncomingInvite: row.status === 'pending' && row.requested_by !== user.id,
            isOutgoingInvite: row.status === 'pending' && row.requested_by === user.id,
            currentStreak: row.current_streak,
            longestStreak: row.longest_streak,
            freezesAvailable: row.freezes_available,
          };
        })
      );
    } catch (error) {
      console.error('Error fetching streak partnerships:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPartnerships();
  }, [fetchPartnerships]);

  const requestPartnership = async (friendId: string) => {
    try {
      const { error } = await supabase.rpc('request_streak_partnership', { p_friend_id: friendId });
      if (error) throw error;
      toast({ title: "Convite enviado! 🔥", description: "Se ela aceitar, a ofensiva em dupla começa." });
      await fetchPartnerships();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível enviar o convite.";
      toast({ title: "Erro", description: message, variant: "destructive" });
      return false;
    }
  };

  const respondToPartnership = async (partnershipId: string, accept: boolean) => {
    try {
      const { error } = await supabase.rpc('respond_to_streak_partnership', {
        p_partnership_id: partnershipId,
        p_accept: accept,
      });
      if (error) throw error;
      if (accept) {
        toast({ title: "Ofensiva em dupla iniciada! 🔥", description: "Leiam todo dia pra manter o fogo aceso." });
      }
      await fetchPartnerships();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível responder ao convite.";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  const endPartnership = async (partnershipId: string) => {
    try {
      const { error } = await supabase.rpc('end_streak_partnership', { p_partnership_id: partnershipId });
      if (error) throw error;
      await fetchPartnerships();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível encerrar a ofensiva.";
      toast({ title: "Erro", description: message, variant: "destructive" });
    }
  };

  const getProgress = async (partnershipId: string): Promise<StreakPartnershipProgress | null> => {
    try {
      const { data, error } = await supabase.rpc('get_streak_partnership_progress', {
        p_partnership_id: partnershipId,
      });
      if (error) throw error;
      return data as unknown as StreakPartnershipProgress;
    } catch (error) {
      console.error('Error fetching streak partnership progress:', error);
      return null;
    }
  };

  return {
    partnerships,
    loading,
    requestPartnership,
    respondToPartnership,
    endPartnership,
    getProgress,
    refetch: fetchPartnerships,
  };
};
