import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerPushToken, unregisterPushToken, DEMO_MODE } from '../api/client';
import { navigateFromNotification } from '../navigation/navigationRef';

const PUSH_TOKEN_STORAGE_KEY = 'expo_push_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests permission, registers the device for Expo push notifications,
 * and stores the token on the backend for the logged-in user. Provider-
 * agnostic on the backend side (see PushProvider/ExpoPushProvider) — this
 * file is the Expo-specific half.
 *
 * Requires a linked EAS project (`extra.eas.projectId` in app.json) — until
 * that's set up, this fails gracefully (logs, doesn't throw) rather than
 * blocking app usage.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (DEMO_MODE) return null;

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0071E3',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission was not granted.');
    return null;
  }

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId || projectId === 'REPLACE_WITH_YOUR_EAS_PROJECT_ID') {
    console.log('No EAS project linked yet (app.json extra.eas.projectId) — skipping push token registration.');
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
    await registerPushToken(token, Platform.OS);
    return token;
  } catch (error) {
    console.log('Failed to obtain Expo push token:', error);
    return null;
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  if (token) {
    await unregisterPushToken(token);
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  }
}

/**
 * Maps a notification's payload (see NotificationService::create on the
 * backend) to a screen to navigate to on tap. New notification types only
 * need a new case here.
 */
function navigateForNotification(data: Record<string, unknown>): void {
  if (data['relatedEntityType'] === 'student' && data['relatedEntityId']) {
    navigateFromNotification('Students', {
      screen: 'StudentDetail',
      params: { studentId: Number(data['relatedEntityId']) },
    });
  }
}

/**
 * Sets up the two Expo notification listeners. Call once, near app startup
 * (see NotificationProvider), and call the returned cleanup on unmount.
 */
export function setupNotificationListeners(): () => void {
  const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
    // Foreground receipt: no action needed beyond the OS-level banner
    // (see setNotificationHandler above) — the in-app notification list
    // isn't built on mobile yet, only push delivery + tap-to-navigate.
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    navigateForNotification(data);
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
