import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api, readToken } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** Registers one Expo token when the app runs on a physical device. */
export async function registerPushToken() {
  if (Platform.OS === 'web' || !Device.isDevice) return { mode: 'skipped' as const, reason: 'physical-device-required' };
  const accessToken = await readToken();
  if (!accessToken) return { mode: 'skipped' as const, reason: 'not-authenticated' };
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return { mode: 'skipped' as const, reason: 'permission-denied' };
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  await api('/api/app/device-tokens', { method: 'POST', body: JSON.stringify({ token, platform: Platform.OS }) }, accessToken);
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'default', importance: Notifications.AndroidImportance.DEFAULT });
  return { mode: 'registered' as const, token };
}
