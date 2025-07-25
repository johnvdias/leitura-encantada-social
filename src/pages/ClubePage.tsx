import { useState, useEffect, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, BookOpen, Calendar, Crown, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClubDiscussions } from "@/components/ClubDiscussions";
import { EditClubDialog } from "@/components/EditClubDialog";
import { DeleteClubDialog } from "@/components/DeleteClubDialog"; // Importar o componente
import { MemberManagement } from "@/components/MemberManagement";
import { CreateClubScheduleDialog } from "@/components/CreateClubScheduleDialog";
import { ClubSchedulesSection } from "@/components/ClubSchedulesSection";

interface Club {
  id: string;
  name: string;
  description: string;
  created_at: string;
  is_private: boolean;
  max_members: number;
  creator_id: string;
  current_book_id: string;
  books?: {
    title: string;
    author: string;
    cover_url: string;
  };
  profiles: {
    display_name: string;
    avatar_url: string;
  };
}

interface Member {
  id: string;
  role: string;
  joined_at: string;
  profiles: {
    display_name: string;
    avatar_url: string;
    user_id: string;
  };
}

const ClubePage = () => {
  const { clubId } = useParams();
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchClubData = useCallback(async () => {
    if (!clubId) return;

    setLoading(true);
    try {
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select(`*, books (title, author, cover_url)`)
        .eq('id', clubId)
        .single();

      if (clubError) throw clubError;

      const { data: creatorProfile, error: creatorError } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', clubData.creator_id)
        .single();

      const clubWithProfile = {
        ...clubData,
        profiles: creatorProfile || { display_name: 'Usuário', avatar_url: '' }
      };

      setClub(clubWithProfile);
      setIsCreator(clubData.creator_id === user?.id);

      const { data: membersData, error: membersError } = await supabase
        .from('club_members')
        .select('*')
        .eq('club_id', clubId);

      if (membersError) throw membersError;

      const memberUserIds = membersData?.map(m => m.user_id) || [];
      const { data: memberProfilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', memberUserIds);

      const membersWithProfiles = membersData?.map(member => ({
        ...member,
        profiles: memberProfilesData?.find(p => p.user_id === member.user_id) || {
          display_name: 'Usuário',
          avatar_url: '',
          user_id: member.user_id
        }
      })) || [];

      setMembers(membersWithProfiles);
      setIsMember(!!membersData?.find(m => m.user_id === user?.id));

    } catch (error) {
      console.error('Error fetching club data:', error);
    } finally {
      setLoading(false);
    }
  }, [clubId, user, toast]);

  useEffect(() => {
    if (clubId) {
      fetchClubData();
    }
  }, [clubId, fetchClubData]);

  // leaveClub function...

  if (!clubId || !club) {
    // Render loading or navigate away
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="card-enchanted mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            {/* Club details */}
            <div className="flex-1">
              {/* ...código dos detalhes do clube... */}
            </div>

            {/* Actions for creator and members */}
            <div className="flex items-center gap-2">
              {isCreator && (
                <>
                  <EditClubDialog club={club} onUpdate={fetchClubData} />
                  <DeleteClubDialog clubId={club.id} clubName={club.name} /> 
                  <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                    <Crown className="h-3 w-3 mr-1" />
                    Criador
                  </Badge>
                </>
              )}
              {isMember && !isCreator && (
                <Button variant="outline" size="sm" onClick={() => {}}>
                  <UserMinus className="h-4 w-4 mr-1" />
                  Sair do Clube
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {/* ...resto do componente... */}
      </Card>
      {isMember ? (
        <Tabs defaultValue="discussions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discussions">Discussões</TabsTrigger>
            <TabsTrigger value="members">Membros</TabsTrigger>
            <TabsTrigger value="schedules">Cronogramas</TabsTrigger>
          </TabsList>

          <TabsContent value="discussions">
            <ClubDiscussions clubId={clubId} isCreator={isCreator} />
          </TabsContent>

          <TabsContent value="members">
            <Card className="card-enchanted">
              <CardHeader>
                <CardTitle>Membros do Clube</CardTitle>
              </CardHeader>
              <CardContent>
                {isCreator ? (
                  <MemberManagement clubId={club.id} creatorId={club.creator_id} />
                ) : (
                  <div className="space-y-4">
                    {/* Member list for non-creators */}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedules">
            {isCreator && (
              <div className="flex justify-end mb-4">
                <CreateClubScheduleDialog clubId={clubId} />
              </div>
            )}
            <ClubSchedulesSection clubId={clubId} isCreator={isCreator} />
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="text-center py-12">
          {/* Non-member view */}
        </Card>
      )}
    </div>
  );
};

export default ClubePage;
