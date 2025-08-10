import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const VAPID_PUBLIC_KEY = "BPQgv9sXBsmA0r6uR__4CZhAJL22o37CXBC2EeOrNQAjAg21VysA8Vikf9LRHqp8hWRmpcIenPGuHVKkeNpGUNg";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const NotificationPermissionManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    const registerServiceWorkerAndSubscribe = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            // Already subscribed, maybe update the server record
            return;
        }

        const permission = await window.Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Push notification permission not granted.');
          return;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        // Save subscription to the database
        const { error } = await supabase.from('push_subscriptions').insert({
          user_id: user.id,
          subscription: subscription.toJSON(),
        });

        if (error) {
          console.error('Error saving subscription:', error);
          toast({
            title: 'Erro ao se inscrever',
            description: 'Não foi possível salvar sua inscrição para notificações.',
            variant: 'destructive',
          });
        } else {
            toast({
                title: 'Inscrito para Notificações!',
                description: 'Você receberá atualizações importantes.'
            })
        }

      } catch (error) {
        console.error('Error with push notifications:', error);
      }
    };

    registerServiceWorkerAndSubscribe();
  }, [user, toast]);

  return null; // This component does not render anything
};
