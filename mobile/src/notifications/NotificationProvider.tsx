import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '../services/notifications';

/**
 * No visual output — wires up push notification listeners once at startup,
 * and (re-)registers the device's push token whenever a user logs in.
 * Mounted inside <AuthProvider> in App.tsx so useAuth() is available.
 */
export function NotificationProvider(): null {
  const { role } = useAuth();

  useEffect(() => {
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  useEffect(() => {
    if (role !== null) {
      void registerForPushNotificationsAsync();
    }
  }, [role]);

  return null;
}
