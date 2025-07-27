import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMinus } from "lucide-react";
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
  current_book_id?: string | null;
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
        setLoading(true);

        // 1. Fetch club data without nested books join initially
        const { data: clubData, error: clubError } = await supabase
            .from('clubs')
            .select(`*`)
            .eq('id', clubId)
            .single();

        if (clubError || !clubData) {
            throw new Error("Clube não encontrado.");
        }

        // 2. Fetch creator profile separately
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', clubData.creator_id)
            .single();

        if (profileError) {
            console.warn("Erro ao carregar o perfil do criador:", profileError);
            // Continue even if creator profile fails to load
        }

        // 3. Fetch current book details if current_book_id exists
        let currentBookDetails = null;
        if (clubData.current_book_id) {
            const { data: bookData, error: bookError } = await supabase
                .from('books')
                .select('id, title, author, cover_url')
                .eq('id', clubData.current_book_id)
                .single();
            if (bookError) {
                console.warn("Erro ao carregar os detalhes do livro atual:", bookError);
            } else {
                currentBookDetails = bookData;
            }
        }

        const enrichedClubData = {
            ...clubData,
            profiles: profileData || { display_name: 'Desconhecido', avatar_url: '' }, // Default profile
            books: currentBookDetails
        };

        setClub(enrichedClubData as unknown as Club);

        const { data: memberInfoData, error: memberInfoError } = await supabase
            .from('club_members')
            .select('user_id, role')
            .eq('club_id', clubId);

        if (memberInfoError) throw new Error("Erro ao carregar informações dos membros.");
        
        if (!memberInfoData || memberInfoData.length === 0) {
            setMembers([]);
        } else {
            const memberUserIds = memberInfoData.map(m => m.user_id);
            const { data: membersProfileData, error: membersProfileError } = await supabase
                .from('profiles')
                .select('user_id, display_name, avatar_url')
                .in('user_id', memberUserIds);

            if (membersProfileError) throw new Error("Erro ao carregar perfis dos membros.");

            const membersMap = new Map(membersProfileData.map(p => [p.user_id, p]));
            const combinedMembers = memberInfoData.map(memberInfo => ({
                ...memberInfo,
                profiles: membersMap.get(memberInfo.user_id) || { display_name: 'Usuário', avatar_url: '' }
            }));
            
            setMembers(combinedMembers as unknown as Member[]);
            setIsMember(!!user && combinedMembers.some(m => m.user_id === user.id));
        }

    } catch (err: any) {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
        setClub(null);
        setMembers([]);
    } finally {
        setLoading(false);
    }
  }, [clubId, user, toast]);

  useEffect(() => {
    fetchClubData();
  }, [fetchClubData]);
  
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
                <p className="font-semibold text-sm text-muted-foreground">Leitura Atual</p>
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
              <CardHeader><h3 className="text-lg font-semibold">Membros do Clube</h3></CardHeader>
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
