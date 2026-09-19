import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useToast } from './use-toast';

// A chave VAPID pública agora é carregada das variáveis de ambiente do Vite.
// Isso garante que a mesma chave usada no PWA build é usada aqui.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  const getSubscriptionState = useCallback(async () => {
    if (!isSupported) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setIsSubscribed(!!sub);
      setSubscription(sub);
    } catch (err) {
      console.error('Error getting subscription state:', err);
      setError('Não foi possível verificar o status da sua inscrição de notificação.');
    }
  }, [isSupported]);
  
  useEffect(() => {
    getSubscriptionState();
  }, [getSubscriptionState]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user) {
      setError('Notificações push não são suportadas ou você não está logado.');
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await window.Notification.requestPermission();
      
      if (permission !== 'granted') {
          toast({ title: "Permissão negada", description: "Você precisa permitir notificações nas configurações do seu navegador.", variant: "destructive" });
          return;
      }
      
      if (!VAPID_PUBLIC_KEY) {
        throw new Error('VITE_VAPID_PUBLIC_KEY não está definida no arquivo .env');
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await supabase.from('push_subscriptions').insert({
        user_id: user.id,
        subscription: sub.toJSON() as unknown as Json,
      });

      setIsSubscribed(true);
      setSubscription(sub);
      toast({ title: 'Inscrito com sucesso!', description: 'Você receberá notificações push.' });
      setError(null);
    } catch (err) {
      console.error('Error subscribing to push notifications:', err);
      setError('Falha ao se inscrever para notificações.');
      toast({ title: "Erro ao se inscrever", variant: "destructive" });
    }
  }, [isSupported, user, toast]);

  const unsubscribe = useCallback(async () => {
    if (!subscription || !user) return;
    
    try {
      await subscription.unsubscribe();
      // Remove a subscrição do banco de dados pelo endpoint, que é um identificador único
      await supabase.from('push_subscriptions').delete().eq('subscription->>endpoint', subscription.endpoint);
      
      setIsSubscribed(false);
      setSubscription(null);
      toast({ title: 'Inscrição cancelada', description: 'Você não receberá mais notificações push.' });
      setError(null);
    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err);
      setError('Falha ao cancelar a inscrição.');
      toast({ title: "Erro ao cancelar inscrição", variant: "destructive" });
    }
  }, [subscription, user, toast]);

  return { isSubscribed, subscribe, unsubscribe, isSupported, error };
};
