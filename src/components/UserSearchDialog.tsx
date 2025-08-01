import { useState, Fragment } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UserSearchResult {
  user_id: string;
  display_name: string;
  avatar_url: string;
}

interface UserSearchDialogProps {
  children: React.ReactNode;
  onUserSelected: (userId: string) => void;
}

export function UserSearchDialog({ children, onUserSelected }: UserSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchTerm.trim() || !user) return;
    setLoading(true);
    try {
      // Busca por usuários cujo nome de exibição contenha o termo de busca,
      // excluindo o próprio usuário logado.
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .ilike('display_name', `%${searchTerm}%`)
        .neq('user_id', user.id)
        .limit(10);
      
      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível realizar a busca.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectUser = (userId: string) => {
    onUserSelected(userId);
    setOpen(false);
    setSearchTerm('');
    setResults([]);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Membro ao Clube</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Digite o nome do usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
            </Button>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {results.length > 0 ? (
              results.map(result => (
                <div key={result.user_id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={result.avatar_url} />
                      <AvatarFallback>{result.display_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{result.display_name}</span>
                  </div>
                  <Button size="sm" onClick={() => handleSelectUser(result.user_id)}>
                    <UserPlus className="mr-2 h-4 w-4"/>
                    Adicionar
                  </Button>
                </div>
              ))
            ) : (
              !loading && <p className="text-center text-muted-foreground pt-4">Nenhum usuário encontrado.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
