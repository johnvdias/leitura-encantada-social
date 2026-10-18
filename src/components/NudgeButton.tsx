import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Hand } from 'lucide-react';
import { shouldNotify } from '@/lib/notificationPreferences';

interface NudgeButtonProps {
  friendId: string;
  friendName: string;
}

const nudgeOptions = [
  { type: 'no_progress', message: 'Sua estante está com saudades de você!' },
  { type: 'inactive_feed', message: 'Que tal compartilhar sua leitura atual no feed?' },
  { type: 'generic', message: 'Lembrei de você! Que tal uma pausa para a leitura?' },
  { type: 'generic', message: 'Seu livro está esperando ansioso pra você virar a próxima página!' },
  { type: 'generic', message: 'Larga o celular e vai ler um pouquinho, vai! 📖' },
  { type: 'no_progress', message: 'Cadê você? Seu livro tá se sentindo abandonado...' },
  { type: 'no_progress', message: 'Já faz tempo que você não lê nada... tudo bem por aí?' },
  { type: 'generic', message: 'Que saudade de ver você lendo! Bora voltar pra história?' },
  { type: 'inactive_feed', message: 'A gente tá curiosa pra saber o que você está lendo agora 👀' },
  { type: 'generic', message: 'Uma pausa com um bom livro cai bem agora, não acha?' },
  { type: 'no_progress', message: 'Seu personagem favorito tá esperando você voltar pra história!' },
  { type: 'generic', message: 'Só passando pra lembrar: ler 10 minutinhos já conta! 💛' },
  { type: 'generic', message: 'Bati minha meta hoje! Vem ler comigo? 😄' },
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

      if (await shouldNotify(friendId, 'nudges')) {
        await supabase.from('notifications').insert({
          user_id: friendId,
          type: 'nudge',
          title: notificationTitle,
          content: message,
          related_id: user.id,
        });

        // Push notifications com tratamento robusto de erros
        supabase.functions.invoke('send-push-notification', {
          body: {
            targetUserId: friendId,
            type: 'nudge',
            relatedId: user.id,
            tag: `nudge-${user.id}-${friendId}`
          },
        }).then(({ data, error: functionError }) => {
          if (functionError) {
            console.log('Push notification não disponível (normal se não configurado):', functionError.message);
            // Não é um erro crítico - as notificações in-app funcionam
          } else {
            console.log('Push notification enviada com sucesso:', data);
          }
        }).catch(err => {
          console.log('Push notification indisponível (funcionamento normal mantido):', err.message);
          // A funcionalidade principal da cutucação continua funcionando
        });
      }

      // Como não estamos mais esperando, o toast de sucesso é mostrado imediatamente.
      toast({
        title: 'Cutucão enviado!',
        description: `Você cutucou ${friendName}.`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
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
      <PopoverContent className="w-72 p-2">
        <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
          {nudgeOptions.map((option, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="justify-start text-left h-auto whitespace-normal"
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
