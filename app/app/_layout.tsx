import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { registerPushToken } from '../src/notifications';
export default function Layout() {
  useEffect(() => { void registerPushToken().catch(() => undefined); }, []);
  return <Stack screenOptions={{ headerShown: false }} />;
}
