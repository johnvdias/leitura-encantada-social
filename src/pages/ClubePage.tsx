import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { UserMinus, Hourglass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ClubDiscussions } from "@/components/ClubDiscussions";
import { EditClubDialog } from "@/components/EditClubDialog";
import { DeleteClubDialog } from "@/components/DeleteClubDialog";
import { MemberManagement } from "@/components/MemberManagement";
import { CreateClubScheduleDialog } from "@/components/CreateClubScheduleDialog";
import { ClubSchedulesSection } from "@/components/ClubSchedulesSection";
import { ClubInviteDialog } from "@/components/ClubInviteDialog";
import { ClubBookPollSection } from "@/components/ClubBookPollSection";

// Interfaces
interface Club {
  id: string;
  name: string;
  description: string;
  created_at: string;
  is_private: boolean;
  max_members: number;
  creator_id: string;
  current_book_id?: string | null;
  invite_code?: string | null;
  books?: {
    id: string;
    title: string;
    author: string;
    cover_url: string;
  } | null;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface Member {
  user_id: string;
  role: 'creator' | 'member';
  status: 'approved' | 'pending' | 'rejected';
  profiles: {
    display_name: string;
    avatar_url: string;
  };
}

const ClubePage = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [readProgress, setReadProgress] = useState<{ completed: number; total: number } | null>(null);
  
  const isCreator = club?.creator_id === user?.id;

  const fetchClubData = useCallback(async () => {
    if (!clubId || !user) return;
    try {
        setLoading(true);

        // Etapa 1: Buscar os dados básicos do clube.
        const { data: clubData, error: clubError } = await supabase
            .from('clubs')
            .select('*')
            .eq('id', clubId)
            .single();
        if (clubError || !clubData) throw new Error("Clube não encontrado ou acesso restrito.");

        // Etapa 2: Buscar o perfil do criador.
        const { data: creatorProfile, error: profileError } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', clubData.creator_id)
            .maybeSingle();
        if (profileError) throw new Error("Não foi possível carregar o perfil do criador.");
        
        // Etapa 3: Buscar o livro atual (se existir).
        let bookData = null;
        if (clubData.current_book_id) {
            const { data: currentBook, error: bookError } = await supabase
                .from('books')
                .select('*')
                .eq('id', clubData.current_book_id)
                .single();
            if (bookError) console.warn("Não foi possível carregar o livro atual.");
            else bookData = currentBook;
        }

        // Etapa 4: Combinar os dados.
        const formattedClubData = {
          ...clubData,
          profiles: creatorProfile || { display_name: null, avatar_url: null },
          books: bookData
        };
        setClub(formattedClubData as unknown as Club);

        // Etapa 5: Buscar os membros.
        const { data: membersData, error: membersError } = await supabase
            .from('club_members')
            .select('user_id, role, status, profiles(display_name, avatar_url)')
            .eq('club_id', clubId);

        if (membersError) throw new Error("Erro ao carregar membros.");

        setMembers(membersData as Member[]);
        const currentUserMembership = membersData.find(m => m.user_id === user.id);
        setIsMember(currentUserMembership?.status === 'approved');
        setHasPendingRequest(currentUserMembership?.status === 'pending');

        // Etapa 6: Calcular o progresso de leitura do clube.
        // Não existe um catalog_id compartilhado entre os livros pessoais dos
        // membros, então a comparação é aproximada por título+autor normalizados.
        const approvedIds = membersData
            .filter(m => m.status === 'approved')
            .map(m => m.user_id);

        if (bookData && approvedIds.length > 0) {
            const { data: memberBooksData } = await supabase
                .from('books')
                .select('user_id, title, author')
                .in('user_id', approvedIds)
                .eq('reading_status', 'completed');

            const normalize = (s: string) => s.trim().toLowerCase();
            const targetTitle = normalize(bookData.title);
            const targetAuthor = normalize(bookData.author);
            const completedUserIds = new Set(
                (memberBooksData || [])
                    .filter(b => normalize(b.title) === targetTitle && normalize(b.author) === targetAuthor)
                    .map(b => b.user_id)
            );
            setReadProgress({ completed: completedUserIds.size, total: approvedIds.length });
        } else {
            setReadProgress(null);
        }

    } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao carregar o clube.";
        toast({ title: "Erro", description: message, variant: "destructive" });
        setClub(null);
        setMembers([]);
    } finally {
        setLoading(false);
    }
  }, [clubId, user, toast]);

  useEffect(() => {
    fetchClubData();
  }, [fetchClubData]);
  
  const handleJoinClub = async () => {
    if (!user || !club) return;
    try {
        const { error } = await supabase.from('club_members').insert({
            club_id: club.id,
            user_id: user.id
        });
        if (error) throw error;
        toast({ title: "Solicitação enviada", description: "Seu pedido para entrar no clube foi enviado ao criador." });
        fetchClubData();
    } catch (error) {
        toast({ title: "Erro", description: "Não foi possível enviar sua solicitação.", variant: "destructive" });
    }
  };
  
  const handleLeaveClub = async () => {
    if (!user || !club) return;
    try {
      const { error } = await supabase.from('club_members')
        .delete()
        .eq('club_id', club.id)
        .eq('user_id', user.id);
      if (error) throw error;
      toast({ title: "Você saiu do clube", description: `Você não é mais membro de "${club.name}".`});
      if(isCreator) navigate('/clubes');
      else fetchClubData();
    } catch (error) {
        toast({ title: "Erro", description: "Não foi possível sair do clube.", variant: "destructive" });
    }
  };

  if (loading) return <div className="container py-8"><Skeleton className="h-48 w-full" /></div>;
  if (!club) return <div className="container py-8 text-center">Clube não encontrado.</div>;

  const approvedMembers = members.filter(m => m.status === 'approved');

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
                {isCreator && (
                  <>
                    <ClubInviteDialog
                      clubId={club.id}
                      inviteCode={club.invite_code ?? null}
                      onCodeGenerated={(code) => setClub((prev) => prev && { ...prev, invite_code: code })}
                    />
                    <EditClubDialog club={club} onUpdate={fetchClubData} />
                    <DeleteClubDialog clubId={club.id} clubName={club.name} />
                  </>
                )}
                {isMember && !isCreator && <Button variant="outline" onClick={handleLeaveClub}><UserMinus className="h-4 w-4 mr-2" /> Sair</Button>}
                {!isMember && !hasPendingRequest && <Button onClick={handleJoinClub}>Entrar no Clube</Button>}
                {hasPendingRequest && <Button variant="outline" disabled><Hourglass className="h-4 w-4 mr-2 animate-spin" /> Pendente</Button>}
              </div>
          </div>
        </CardHeader>
         {club.books && (
            <CardContent>
                <p className="font-semibold text-sm text-muted-foreground">Leitura Atual</p>
                <div className="flex items-center gap-4 mt-2">
                    <img src={club.books.cover_url || '/placeholder.svg'} alt={club.books.title} className="h-24 w-16 object-cover rounded"/>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold">{club.books.title}</p>
                        <p className="text-sm text-muted-foreground">{club.books.author}</p>
                    </div>
                </div>
                {readProgress && readProgress.total > 0 && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Progresso do clube</span>
                            <span>{readProgress.completed} de {readProgress.total} concluíram</span>
                        </div>
                        <Progress value={(readProgress.completed / readProgress.total) * 100} className="h-2" />
                    </div>
                )}
            </CardContent>
        )}
      </Card>

      {isMember ? (
        <Tabs defaultValue="discussions">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="discussions">Discussões</TabsTrigger>
            <TabsTrigger value="schedules">Cronogramas</TabsTrigger>
            <TabsTrigger value="votacao">Votação</TabsTrigger>
            <TabsTrigger value="members">Membros ({approvedMembers.length})</TabsTrigger>
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

          <TabsContent value="votacao" className="mt-6">
            <ClubBookPollSection clubId={club.id} isCreator={isCreator} onResolved={fetchClubData} />
          </TabsContent>

          <TabsContent value="members" className="mt-6">
             {isCreator ? (
                  <MemberManagement clubId={club.id} initialMembers={members} creatorId={club.creator_id} onMembersUpdate={fetchClubData} />
                ) : (
                  <Card>
                    <CardHeader><h3 className="text-lg font-semibold">Membros do Clube</h3></CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {approvedMembers.map(member => (
                          <li key={member.user_id} className="flex items-center gap-3">
                            <Avatar className="h-10 w-10"><AvatarImage src={member.profiles.avatar_url} /><AvatarFallback>{member.profiles.display_name?.charAt(0)}</AvatarFallback></Avatar>
                            <div>
                              <p className="font-medium">{member.profiles.display_name}</p>
                              {member.user_id === club.creator_id && (
                                <span className="text-xs text-muted-foreground">Criador</span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="text-center py-12"><CardContent><p>Você precisa ser um membro para ver as atividades do clube.</p></CardContent></Card>
      )}
    </div>
  );
};

export default ClubePage;
