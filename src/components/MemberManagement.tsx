import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Crown, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserSearchDialog } from './UserSearchDialog';

interface Member {
  user_id: string;
  role: 'creator' | 'member';
  status: 'approved' | 'pending' | 'rejected';
  profiles: {
    display_name: string;
    avatar_url: string;
  };
}

interface MemberManagementProps {
  clubId: string;
  initialMembers: Member[];
  creatorId: string;
  onMembersUpdate: () => void;
}

export function MemberManagement({ clubId, initialMembers, creatorId, onMembersUpdate }: MemberManagementProps) {
  const { toast } = useToast();
  const [members, setMembers] = useState(initialMembers);
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);

  const approvedMembers = members.filter(m => m.status === 'approved');
  const pendingMembers = members.filter(m => m.status === 'pending');

  const handleUpdateMemberStatus = async (userId: string, status: 'approved' | 'rejected') => {
    setLoadingMemberId(userId);
    try {
      if (status === 'rejected') {
        // Se for rejeitado, removemos o membro da tabela
        const { error } = await supabase
          .from('club_members')
          .delete()
          .eq('club_id', clubId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        // Se for aprovado, atualizamos o status
        const { error } = await supabase
          .from('club_members')
          .update({ status: 'approved' })
          .eq('club_id', clubId)
          .eq('user_id', userId);
        if (error) throw error;
      }
      toast({ title: 'Sucesso', description: `O status do membro foi atualizado.` });
      onMembersUpdate(); // Notifica o componente pai para recarregar os dados
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o status do membro.', variant: 'destructive' });
    } finally {
        setLoadingMemberId(null);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      // Verifica se o usuário já é membro ou tem um pedido pendente
      const isAlreadyMember = members.some(m => m.user_id === userId);
      if (isAlreadyMember) {
        toast({ title: 'Aviso', description: 'Este usuário já é membro ou tem uma solicitação pendente.', variant: 'default' });
        return;
      }
      
      const { error } = await supabase.from('club_members').insert({
        club_id: clubId,
        user_id: userId,
        status: 'approved', // Adicionado diretamente pelo criador, então já é aprovado
        role: 'member',
      });
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Novo membro adicionado ao clube.' });
      onMembersUpdate();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível adicionar o membro.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Seção para Adicionar Membros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Adicionar Novo Membro
            <UserSearchDialog onUserSelected={handleAddMember}>
              <Button size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Buscar Usuário
              </Button>
            </UserSearchDialog>
          </CardTitle>
        </CardHeader>
      </Card>
      
      {/* Seção de Pedidos Pendentes */}
      {pendingMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Pendentes ({pendingMembers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {pendingMembers.map(member => (
                <li key={member.user_id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={member.profiles.avatar_url} />
                      <AvatarFallback>{member.profiles.display_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <p className="font-medium truncate">{member.profiles.display_name}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      className="text-green-600 hover:text-green-700"
                      onClick={() => handleUpdateMemberStatus(member.user_id, 'approved')}
                      disabled={loadingMemberId === member.user_id}
                    >
                      {loadingMemberId === member.user_id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleUpdateMemberStatus(member.user_id, 'rejected')}
                       disabled={loadingMemberId === member.user_id}
                    >
                       {loadingMemberId === member.user_id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Seção de Membros Aprovados */}
      <Card>
        <CardHeader>
          <CardTitle>Membros ({approvedMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {approvedMembers.map(member => (
              <li key={member.user_id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={member.profiles.avatar_url} />
                    <AvatarFallback>{member.profiles.display_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{member.profiles.display_name}</p>
                    {member.role === 'creator' && (
                      <span className="text-xs font-semibold text-yellow-500 flex items-center gap-1">
                        <Crown className="h-3 w-3" />
                        Criador
                      </span>
                    )}
                  </div>
                </div>
                {member.user_id !== creatorId && (
                   <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleUpdateMemberStatus(member.user_id, 'rejected')}>
                       Remover
                   </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
