import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (clubId) {
      fetchClubData();
    }
  }, [clubId, user]);

  const fetchClubData = async () => {
    if (!clubId) return;

    try {
      // Fetch club data
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select(`
          *,
          books (title, author, cover_url)
        `)
        .eq('id', clubId)
        .single();

      if (clubError) throw clubError;

      // Fetch creator profile separately
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

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('club_members')
        .select('*')
        .eq('club_id', clubId);

      if (membersError) throw membersError;

      // Fetch profiles for members
      const memberUserIds = membersData?.map(m => m.user_id) || [];
      const { data: memberProfilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', memberUserIds);

      // Combine members with profiles
      const membersWithProfiles = membersData?.map(member => ({
        ...member,
        profiles: memberProfilesData?.find(p => p.user_id === member.user_id) || {
          display_name: 'Usuário',
          avatar_url: '',
          user_id: member.user_id
        }
      })) || [];

      setMembers(membersWithProfiles);

      // Check if current user is a member
      const userMembership = membersData?.find(m => m.user_id === user?.id);
      setIsMember(!!userMembership);

    } catch (error) {
      console.error('Error fetching club data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do clube",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const leaveClub = async () => {
    if (!user || !clubId) return;

    setLeaving(true);
    try {
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Saiu do clube",
        description: "Você saiu do clube com sucesso"
      });

      setIsMember(false);
      fetchClubData();
    } catch (error) {
      console.error('Error leaving club:', error);
      toast({
        title: "Erro",
        description: "Não foi possível sair do clube",
        variant: "destructive"
      });
    } finally {
      setLeaving(false);
    }
  };

  if (!clubId) {
    return <Navigate to="/clubes" replace />;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Carregando clube...</div>
      </div>
    );
  }

  if (!club) {
    return <Navigate to="/clubes" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Club Header */}
      <Card className="card-enchanted mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={club.profiles?.avatar_url} />
                  <AvatarFallback>
                    {club.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    {club.name}
                    {club.is_private && <Badge variant="outline">Privado</Badge>}
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Criado por {club.profiles?.display_name || 'Usuário'}
                  </p>
                </div>
              </div>

              {club.description && (
                <p className="text-muted-foreground mb-4">{club.description}</p>
              )}

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {members.length} de {club.max_members} membros
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Criado {formatDistanceToNow(new Date(club.created_at), {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isCreator && (
                <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                  <Crown className="h-3 w-3 mr-1" />
                  Criador
                </Badge>
              )}
              {isMember && !isCreator && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={leaveClub}
                  disabled={leaving}
                  className="text-red-600 hover:text-red-700"
                >
                  <UserMinus className="h-4 w-4 mr-1" />
                  {leaving ? "Saindo..." : "Sair do Clube"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {club.books && (
          <CardContent>
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Livro Atual</p>
                <p className="text-sm text-muted-foreground">
                  {club.books.title} por {club.books.author}
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Club Content */}
      {isMember ? (
        <Tabs defaultValue="discussions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="discussions">Discussões</TabsTrigger>
            <TabsTrigger value="members">Membros</TabsTrigger>
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
                <div className="space-y-4">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded border">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.profiles?.avatar_url} />
                          <AvatarFallback>
                            {member.profiles?.display_name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member.profiles?.display_name || 'Usuário'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Membro desde {formatDistanceToNow(new Date(member.joined_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {member.profiles?.user_id === club.creator_id && (
                          <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                            <Crown className="h-3 w-3 mr-1" />
                            Criador
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {member.role === 'member' ? 'Membro' : member.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">
              {club.is_private ? "Clube Privado" : "Você não é membro"}
            </h3>
            <p className="text-muted-foreground">
              {club.is_private 
                ? "Este clube é privado e requer um convite para participar."
                : "Entre no clube para ver as discussões e interagir com outros membros."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClubePage;