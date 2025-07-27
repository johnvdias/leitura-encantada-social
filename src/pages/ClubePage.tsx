import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookOpen, Crown, UserMinus, Lock, Globe, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ClubDiscussions } from "@/components/ClubDiscussions";
import { EditClubDialog } from "@/components/EditClubDialog";
import { DeleteClubDialog } from "@/components/DeleteClubDialog";
import { MemberManagement } from "@/components/MemberManagement";
import { CreateClubScheduleDialog } from "@/components/CreateClubScheduleDialog";
import { ClubSchedulesSection } from "@/components/ClubSchedulesSection";

// Interfaces
interface Club {
  id: string;
  name: string;
  description: string;
  created_at: string;
  is_private: boolean;
  creator_id: string;
  books?: {
    id: string;
    title: string;
    author: string;
    cover_url: string;
  } | null;
  profiles: {
    display_name: string;
    avatar_url: string;
  };
}

interface Member {
  user_id: string;
  role: string;
  profiles: {
    display_name: string;
    avatar_url: string;
  };
}

const ClubePage = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  
  const isCreator = club?.creator_id === user?.id;

  const fetchClubData = useCallback(async () => {
    if (!clubId) return;
    try {
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select(`*, books (id, title, author, cover_url), profiles!clubs_creator_id_fkey (display_name, avatar_url)`)
        .eq('id', clubId)
        .single();

      if (clubError) throw new Error("Clube não encontrado.");
      setClub(clubData as unknown as Club);

      const { data: membersData, error: membersError } = await supabase
        .from('club_members')
        .select(`user_id, role, profiles (display_name, avatar_url)`)
        .eq('club_id', clubId);

      if (membersError) throw new Error("Erro ao carregar membros.");
      
      setMembers(membersData as unknown as Member[]);
      setIsMember(!!user && membersData.some(m => m.user_id === user.id));

    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      setClub(null);
    } finally {
      setLoading(false);
    }
  }, [clubId, user, toast]);

  useEffect(() => {
    fetchClubData();
  }, [fetchClubData]);
  
  // Placeholder functions
  const handleJoinClub = async () => {};
  const handleLeaveClub = async () => {};

  if (loading) return <div className="container py-8"><Skeleton className="h-48 w-full" /></div>;
  if (!club) return <div className="container py-8 text-center">Clube não encontrado ou você não tem permissão para vê-lo.</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20 border-2 border-primary/10"><AvatarImage src={club.profiles.avatar_url} /><AvatarFallback>{club.name.charAt(0)}</AvatarFallback></Avatar>
                <div>
                  <h1 className="text-3xl font-bold">{club.name}</h1>
                  <p className="text-muted-foreground max-w-prose">{club.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-end shrink-0">
                {isCreator && (<><EditClubDialog club={club} onUpdate={fetchClubData} /> <DeleteClubDialog clubId={club.id} clubName={club.name} memberCount={members.length} /></>)}
                {isMember && !isCreator && <Button variant="outline" onClick={handleLeaveClub}><UserMinus className="h-4 w-4 mr-2" /> Sair</Button>}
                {!isMember && !club.is_private && <Button onClick={handleJoinClub}>Entrar no Clube</Button>}
              </div>
          </div>
        </CardHeader>
         {club.books && (
            <CardContent>
                <CardDescription>Leitura Atual</CardDescription>
                <div className="flex items-center gap-4 mt-2">
                    <img src={club.books.cover_url || '/placeholder.svg'} alt={club.books.title} className="h-24 w-16 object-cover rounded"/>
                    <div>
                        <p className="font-bold">{club.books.title}</p>
                        <p className="text-sm text-muted-foreground">{club.books.author}</p>
                    </div>
                </div>
            </CardContent>
        )}
      </Card>

      {isMember ? (
        <Tabs defaultValue="discussions">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discussions">Discussões</TabsTrigger>
            <TabsTrigger value="schedules">Cronogramas</TabsTrigger>
            <TabsTrigger value="members">Membros ({members.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="discussions" className="mt-6">
            <ClubDiscussions clubId={club.id} isCreator={isCreator} />
          </TabsContent>

          <TabsContent value="schedules" className="mt-6">
            {isCreator && (
              <div className="flex justify-end mb-4">
                <CreateClubScheduleDialog clubId={club.id} currentBook={club.books} onScheduleCreated={fetchClubData} />
              </div>
            )}
            <ClubSchedulesSection clubId={club.id} isCreator={isCreator} onSchedulesUpdated={fetchClubData} />
          </TabsContent>
          
          <TabsContent value="members" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Membros do Clube</CardTitle></CardHeader>
              <CardContent>
                {isCreator ? (
                  <MemberManagement clubId={club.id} members={members} creatorId={club.creator_id} onMemberRemoved={fetchClubData} />
                ) : (
                  <ul className="space-y-3">
                    {members.map(member => (
                      <li key={member.user_id} className="flex items-center gap-3">
                        <Avatar className="h-10 w-10"><AvatarImage src={member.profiles.avatar_url} /><AvatarFallback>{member.profiles.display_name?.charAt(0)}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium">{member.profiles.display_name}</p>
                          <span className="text-xs text-muted-foreground">{member.role === 'creator' ? 'Criador' : 'Membro'}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="text-center py-12"><CardContent><p>Você precisa ser um membro para ver as atividades do clube.</p></CardContent></Card>
      )}
    </div>
  );
};

export default ClubePage;
