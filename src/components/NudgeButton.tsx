import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Hand } from 'lucide-react';

interface NudgeButtonProps {
  friendId: string;
  friendName: string;
}

const nudgeOptions = [
  { type: 'no_progress', message: 'Sua estante está com saudades de você!' },
  { type: 'inactive_feed', message: 'Que tal compartilhar sua leitura atual no feed?' },
  { type: 'generic', message: 'Lembrei de você! Que tal uma pausa para a leitura?' },
];

export function NudgeButton({ friendId, friendName }: NudgeButtonProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleNudge = async (type: string, message: string) => {
    if (!user || !profile) return;

    setLoading(true);
    try {
      // 1. Cria a entrada do cutucão (rastreamento interno)
      const { error: nudgeError } = await supabase
        .from('nudges')
        .insert({
          sender_id: user.id,
          receiver_id: friendId,
          type,
          message,
        });
      
      if (nudgeError) throw nudgeError;

      const notificationTitle = `${profile.display_name} te cutucou! 👋`;

      // 2. Cria uma notificação no sistema de notificação do aplicativo
      await supabase.from('notifications').insert({
        user_id: friendId,
        type: 'nudge',
        title: notificationTitle,
        content: message,
        related_id: user.id, // Link para o perfil de quem enviou
      });
      
      // 3. Dispara a notificação push através da Função Edge correta
      const { error: functionError } = await supabase.functions.invoke('send-push-notification', {
        body: { 
          targetUserId: friendId,
          title: notificationTitle,
          body: message,
          // A tag impede o empilhamento de notificações do mesmo tipo
          tag: `nudge-${user.id}-${friendId}` 
        },
      });

      if (functionError) {
          // Este erro é esperado se o usuário não tiver permissão para notificações
          console.warn('Não foi possível enviar a notificação push. O usuário pode não ter concedido permissão ou não ter uma subscrição ativa.', functionError);
      }

      toast({
        title: 'Cutucão enviado!',
        description: `Você cutucou ${friendName}.`,
      });
      setOpen(false);

    } catch (error) {
      console.error('Erro ao enviar cutucão:', error);
      toast({ title: 'Erro ao enviar cutucão', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Hand className="h-4 w-4 mr-1" />
          Cutucar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="flex flex-col gap-1">
          {nudgeOptions.map((option) => (
            <Button
              key={option.type}
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => handleNudge(option.type, option.message)}
              disabled={loading}
            >
              {option.message}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
