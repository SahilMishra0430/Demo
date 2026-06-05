// src/hooks/usePushNotifications.js
import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// Converts a base64 VAPID public key to the Uint8Array that the browser needs
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export const usePushNotifications = () => {
  const [supported,   setSupported]   = useState(false);
  const [subscribed,  setSubscribed]  = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [swReg,       setSwReg]       = useState(null);

  // Register service worker and check current subscription state on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setSupported(true);

    navigator.serviceWorker
      .register('/sw.js')
      .then(async (reg) => {
        setSwReg(reg);
        const existing = await reg.pushManager.getSubscription();
        setSubscribed(!!existing);
      })
      .catch((err) => console.error('SW registration failed:', err));
  }, []);

  const subscribe = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Ask for notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Please allow notifications in your browser settings.');
        return;
      }

      // 2. Wait until the SW is fully active (fixes "push service error")
      const reg = await navigator.serviceWorker.ready;

      // 3. Fetch our VAPID public key from the backend
      const { data } = await api.get('/push/public-key');

      // 4. Subscribe this browser to push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });

      // 5. Save subscription to our backend
      await api.post('/push/subscribe', subscription.toJSON());
      setSubscribed(true);
    } catch (err) {
      console.error('Push subscribe error:', err);
      alert('Failed to enable push notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await api.delete('/push/subscribe', { data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, subscribed, loading, subscribe, unsubscribe };
};
