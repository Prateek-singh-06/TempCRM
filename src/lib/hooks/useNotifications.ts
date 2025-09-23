"use client";

import { useState, useEffect, useCallback } from 'react';

interface NotificationData {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  url?: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    name: string;
    email: string;
  };
}

interface NotificationResponse {
  notifications: NotificationData[];
  totalCount: number;
  hasMore: boolean;
  error?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Fetch notifications with caching
  const fetchNotifications = useCallback(async (limit = 20, offset = 0, force = false) => {
    // Simple caching: don't fetch if we fetched within the last 30 seconds
    const now = Date.now();
    if (!force && now - lastFetchTime < 30000 && offset === 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/notifications?limit=${limit}&offset=${offset}`);
      const data: NotificationResponse = await response.json();

      if (response.ok) {
        if (offset === 0) {
          setNotifications(data.notifications);
        } else {
          setNotifications(prev => [...prev, ...data.notifications]);
        }

        // Update unread count
        const unread = data.notifications.filter(n => !n.isRead).length;
        setUnreadCount(unread);
        
        // Update last fetch time
        setLastFetchTime(now);
      } else {
        setError(data.error || 'Failed to fetch notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [lastFetchTime]);

  // Send notification
  const sendNotification = useCallback(async (notificationData: {
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    recipientId?: number;
    recipientIds?: number[];
    url?: string;
    sendPush?: boolean;
  }) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send notification');
      }

      return data;
    } catch (err) {
      throw err;
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/read-all', { method: 'PUT' });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      return false;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/delete`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setUnreadCount(prev => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete notification:', err);
      return false;
    }
  }, []);

  // Delete all notifications
  const deleteAllNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/delete-all', { method: 'DELETE' });
      if (response.ok) {
        setNotifications([]);
        setUnreadCount(0);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete all notifications:', err);
      return false;
    }
  }, []);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications not supported');
      }

      const registration = await navigator.serviceWorker.ready;
      // Always source the key from env first; if missing, fetch from server
      let vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string | undefined;
      if (!vapidKey || vapidKey.trim() === '') {
        try {
          const res = await fetch('/api/notifications/public-key');
          if (res.ok) {
            const json = await res.json();
            vapidKey = json.publicKey as string;
          }
        } catch {
          // ignore, handled below
        }
      }

      if (!vapidKey) {
        throw new Error('VAPID public key not available. Configure VAPID_PUBLIC_KEY and NEXT_PUBLIC_VAPID_PUBLIC_KEY.');
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      // Check for existing subscription
      let existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        if (existingSubscription.options.applicationServerKey) {
          // Convert existing key to base64 for comparison
          const existingKeyArray = new Uint8Array(existingSubscription.options.applicationServerKey);
          const existingKeyBase64 = btoa(String.fromCharCode(...existingKeyArray));

          // Convert new key to base64 for comparison
          const newKeyBase64 = btoa(String.fromCharCode(...applicationServerKey));

          // If keys are different, unsubscribe first
          if (existingKeyBase64 !== newKeyBase64) {
            console.log('Existing subscription has different VAPID key, unsubscribing...');
            await existingSubscription.unsubscribe();
            existingSubscription = null;
          }
        } else {
          // Existing subscription has no applicationServerKey, unsubscribe
          console.log('Existing subscription has no applicationServerKey, unsubscribing...');
          await existingSubscription.unsubscribe();
          existingSubscription = null;
        }
      }

      // Subscribe with the correct key
      const subscription = existingSubscription || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to subscribe to push notifications: ${response.status}`);
      }

      return true;
    } catch (err) {
      console.error('Failed to subscribe to push notifications:', err);
      return false;
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    try {
      if (!('Notification' in window)) {
        throw new Error('Notifications not supported');
      }

      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      return false;
    }
  }, []);

  // Initialize notifications on mount
  useEffect(() => {
    fetchNotifications();

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, [fetchNotifications]);

  // Poll for new notifications every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications(20, 0, true); // Force refresh
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    sendNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    subscribeToPush,
    requestPermission
  };
}

// Helper function to convert VAPID key
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

// Note: Key generation is handled server-side for development via
// /api/notifications/generate-keys. Clients should not generate keys.
