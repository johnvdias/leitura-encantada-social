import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Crown, UserMinus, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

interface MemberManagementProps {
  members: Member[];
  creatorId: string;
  clubId: string;
  onUpdate: () => void;
}

export function MemberManagement({ members, creatorId, clubId, onUpdate }: MemberManagementProps) {
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const { toast } = useToast();

  const removeMember = async (memberId: string, memberName: string) => {
    setRemovingMember(memberId);
    try {
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Membro removido",
        description: `${memberName} foi removido do clube`
      });

      onUpdate();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o membro",
        variant: "destructive"
      });
    } finally {
      setRemovingMember(null);
    }
  };

  const promoteToModerator = async (memberId: string, memberName: string) => {
    try {
      const { error } = await supabase
        .from('club_members')
        .update({ role: 'moderator' })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Membro promovido",
        description: `${memberName} agora é moderador do clube`
      });

      onUpdate();
    } catch (error) {
      console.error('Error promoting member:', error);
      toast({
        title: "Erro",
        description: "Não foi possível promover o membro",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      {members.map((member) => {
        const isCreator = member.profiles?.user_id === creatorId;
        const isModerator = member.role === 'moderator';
        
        return (
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
              {isCreator && (
                <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                  <Crown className="h-3 w-3 mr-1" />
                  Criador
                </Badge>
              )}
              {isModerator && !isCreator && (
                <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300">
                  <Shield className="h-3 w-3 mr-1" />
                  Moderador
                </Badge>
              )}
              {!isCreator && !isModerator && (
                <Badge variant="outline">
                  Membro
                </Badge>
              )}

              {/* Creator actions for non-creator members */}
              {!isCreator && (
                <div className="flex gap-1">
                  {!isModerator && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => promoteToModerator(member.id, member.profiles?.display_name || 'Usuário')}
                    >
                      <Shield className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={removingMember === member.id}
                      >
                        <UserMinus className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover membro</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover {member.profiles?.display_name || 'este usuário'} do clube?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeMember(member.id, member.profiles?.display_name || 'Usuário')}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}