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
      // Estas operações são r��pidas e podemos esperar por elas.
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

      await supabase.from('notifications').insert({
        user_id: friendId,
        type: 'nudge',
        title: notificationTitle,
        content: message,
        related_id: user.id,
      });
      
      // Push notifications reativadas com função Edge v2
      supabase.functions.invoke('send-push-notification-v2', {
        body: {
          targetUserId: friendId,
          title: notificationTitle,
          body: message,
          tag: `nudge-${user.id}-${friendId}`
        },
      }).then(({ data, error: functionError }) => {
        if (functionError) {
          console.error('Erro ao enviar push notification:', functionError);
        } else {
          console.log('Push notification enviada com sucesso:', data);
        }
      }).catch(err => {
        console.error('Erro na função push notification:', err);
      });

      // Como não estamos mais esperando, o toast de sucesso é mostrado imediatamente.
      toast({
        title: 'Cutucão enviado!',
        description: `Você cutucou ${friendName}.`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : (error as any)?.message || 'Erro desconhecido';
      console.error('Erro ao registrar o cutucão:', errorMessage);
      toast({
        title: 'Erro ao enviar cutucão',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setOpen(false); // Fecha o pop-up imediatamente.
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
