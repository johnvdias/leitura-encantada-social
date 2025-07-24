import { useState } from "react";
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
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface DeleteClubDialogProps {
  clubId: string;
  clubName: string;
}

export function DeleteClubDialog({ clubId, clubName }: DeleteClubDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Check for number of members
      const { data: members, error: membersError } = await supabase
        .from('club_members')
        .select('id', { count: 'exact' })
        .eq('club_id', clubId);

      if (membersError) throw membersError;

      if (members && members.length > 1) {
        toast({
          title: "Não é possível deletar o clube",
          description: "O clube possui outros membros e não pode ser excluído.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Delete discussions first
      await supabase
        .from('club_discussions')
        .delete()
        .eq('club_id', clubId);

      // Delete members
      await supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId);

      // Delete club
      const { error } = await supabase
        .from('clubs')
        .delete()
        .eq('id', clubId);

      if (error) throw error;

      toast({
        title: "Clube deletado",
        description: `O clube "${clubName}" foi deletado com sucesso.`,
      });

      navigate("/clubes");
    } catch (error) {
      console.error('Error deleting club:', error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar o clube.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Deletar Clube
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deletar Clube</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja deletar o clube "{clubName}"? Esta ação não pode ser desfeita.
            Todas as discussões e membros serão removidos permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? "Deletando..." : "Deletar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}