import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Pin, Calendar, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Discussion {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_announcement: boolean;
  user_id: string;
  profiles: {
    display_name: string;
    avatar_url: string;
  };
}

interface ClubDiscussionsProps {
  clubId: string;
  isCreator: boolean;
}

export function ClubDiscussions({ clubId, isCreator }: ClubDiscussionsProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchDiscussions();
  }, [clubId]);

  const fetchDiscussions = async () => {
    try {
      const { data: discussionsData, error } = await supabase
        .from('club_discussions')
        .select('*')
        .eq('club_id', clubId)
        .order('is_announcement', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = discussionsData?.map(d => d.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      // Combine discussions with profiles
      const discussionsWithProfiles = discussionsData?.map(discussion => ({
        ...discussion,
        profiles: profilesData?.find(p => p.user_id === discussion.user_id) || {
          display_name: 'Usuário',
          avatar_url: ''
        }
      })) || [];

      setDiscussions(discussionsWithProfiles);
    } catch (error) {
      console.error('Error fetching discussions:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as discussões",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !content.trim()) return;

    setCreating(true);
    try {
      const { error } = await supabase
        .from('club_discussions')
        .insert({
          club_id: clubId,
          user_id: user.id,
          title: title.trim(),
          content: content.trim(),
          is_announcement: isAnnouncement && isCreator
        });

      if (error) throw error;

      toast({
        title: "Discussão criada! 💬",
        description: "Sua discussão foi publicada com sucesso"
      });

      setTitle("");
      setContent("");
      setIsAnnouncement(false);
      setShowCreateForm(false);
      fetchDiscussions();
    } catch (error) {
      console.error('Error creating discussion:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a discussão",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">Carregando discussões...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Discussões do Clube
        </h3>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Discussão
        </Button>
      </div>

      {showCreateForm && (
        <Card className="card-enchanted">
          <CardHeader>
            <CardTitle>Criar Nova Discussão</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createDiscussion} className="space-y-4">
              <div>
                <Input
                  placeholder="Título da discussão"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Textarea
                  placeholder="Conteúdo da discussão..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              {isCreator && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="announcement"
                    checked={isAnnouncement}
                    onChange={(e) => setIsAnnouncement(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="announcement" className="text-sm">
                    Marcar como anúncio (destacado)
                  </label>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={creating || !title.trim() || !content.trim()}
                  className="flex-1"
                >
                  {creating ? "Criando..." : "Publicar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {discussions.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma discussão ainda</h3>
            <p className="text-muted-foreground mb-4">
              Seja o primeiro a iniciar uma discussão no clube!
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              Criar Primeira Discussão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {discussions.map((discussion) => (
            <Card key={discussion.id} className="card-enchanted hover-float">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {discussion.is_announcement && (
                        <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                          <Pin className="h-3 w-3 mr-1" />
                          Anúncio
                        </Badge>
                      )}
                      <CardTitle className="text-lg">{discussion.title}</CardTitle>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {discussion.profiles?.display_name || 'Usuário'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDistanceToNow(new Date(discussion.created_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {discussion.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}