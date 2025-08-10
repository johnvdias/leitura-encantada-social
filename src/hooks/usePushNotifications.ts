import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const VAPID_PUBLIC_KEY = 'BAkcwpzo8-CkdZfIFMNiwMpbtPq6g92r-S6Bp6MmVaQBYy3FyEaZrD1WuayvNp1oBDRQ23481JhXkozwrPbRUMY'; // Replace with your actual VAPID public key

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    const checkSubscription = async () => {
      const swRegistration = await navigator.serviceWorker.ready;
      const sub = await swRegistration.pushManager.getSubscription();
      if (sub) {
        setIsSubscribed(true);
        setSubscription(sub);
      }
    };

    checkSubscription();
  }, [user]);

  const subscribe = async () => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }
    if (!('serviceWorker' in navigator)) {
        setError('Service Worker not supported');
        return;
    }

    try {
      const swRegistration = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const sub = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .insert({ user_id: user.id, subscription: sub.toJSON() });
        
      if (dbError) throw dbError;

      setSubscription(sub);
      setIsSubscribed(true);
      setError(null);
    } catch (err: any) {
      console.error('Failed to subscribe the user: ', err);
      setError(err.message || 'Failed to subscribe.');
    }
  };
  
  const unsubscribe = async () => {
      if (!subscription) return;
      
      try {
        await subscription.unsubscribe();
        
        // Find the specific subscription to delete
        const { error: dbError } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('subscription->>endpoint', subscription.endpoint);
        
        if (dbError) throw dbError;

        setIsSubscribed(false);
        setSubscription(null);
        setError(null);

      } catch(err: any) {
          console.error("Failed to unsubscribe: ", err);
          setError(err.message || 'Failed to unsubscribe.');
      }
  };

  return { isSubscribed, subscribe, unsubscribe, error };
}
