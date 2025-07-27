import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, ShieldCheck, User } from "lucide-react";

interface Member {
  user_id: string;
  role: string;
  profiles: {
    display_name: string;
    avatar_url: string;
  };
}

interface MemberManagementProps {
  clubId: string;
  members: Member[];
  creatorId: string;
  onMemberRemoved: () => void;
}

export function MemberManagement({ clubId, members, creatorId, onMemberRemoved }: MemberManagementProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleRemoveMember = async (userId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('remove_club_member', {
        p_club_id: clubId,
        p_user_id: userId
      });

      if (error) throw error;

      toast({
        title: "Membro Removido",
        description: "O usuário foi removido do clube com sucesso.",
      });
      onMemberRemoved();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover o membro.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Gerenciar Membros</h3>
      <ul className="space-y-3">
        {members.map((member) => (
          <li key={member.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.profiles.avatar_url} />
                <AvatarFallback>{member.profiles.display_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{member.profiles.display_name}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {member.role === 'creator' ? <ShieldCheck className="h-3 w-3 text-primary" /> : <User className="h-3 w-3" />}
                  <span>{member.role === 'creator' ? 'Criador' : 'Membro'}</span>
                </div>
              </div>
            </div>

            {creatorId !== member.user_id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover Membro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você tem certeza que deseja remover <span className="font-bold">{member.profiles.display_name}</span> do clube? Esta ação não poderá ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={loading}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {loading ? "Removendo..." : "Sim, remover"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
