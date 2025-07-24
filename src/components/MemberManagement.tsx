import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

interface MemberManagementProps {
  clubId: string;
  creatorId: string;
}

interface Member {
  id: string;
  username: string;
}

export function MemberManagement({ clubId, creatorId }: MemberManagementProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('club_members')
        .select('profiles(id, username)')
        .eq('club_id', clubId);

      if (error) {
        console.error('Error fetching members:', error);
        toast({ title: 'Erro ao buscar membros', variant: 'destructive' });
      } else {
        const memberData = data.map((item: any) => ({
          id: item.profiles.id,
          username: item.profiles.username,
        }));
        setMembers(memberData);
      }
      setLoading(false);
    };

    fetchMembers();
  }, [clubId, toast]);

  const handleRemoveMember = async (memberId: string) => {
    if (memberId === creatorId) {
      toast({
        title: 'Ação não permitida',
        description: 'O criador do clube não pode ser removido.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', memberId);

      if (error) throw error;

      setMembers(members.filter((member) => member.id !== memberId));
      toast({ title: 'Membro removido com sucesso' });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({ title: 'Erro ao remover membro', variant: 'destructive' });
    }
  };
  
  if (loading) return <div>Carregando membros...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Gerenciar Membros</h3>
      <ul className="space-y-2">
        {members.map((member) => (
          <li key={member.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
            <span>{member.username}</span>
            {member.id !== creatorId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveMember(member.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
