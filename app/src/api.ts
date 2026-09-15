import Constants from 'expo-constants';

/**
 * Expo Go exposes the Metro host in the development manifest. Using that host
 * makes a physical device reach the API running on the same computer without
 * requiring a per-device code change. EXPO_PUBLIC_API_URL always wins when it
 * is set (for tunnels, staging, or a deployed API).
 */
function getDevApiUrl() {
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : '';
  return host && host !== 'localhost' && host !== '127.0.0.1' ? `http://${host}:4242` : 'http://localhost:4242';
}

export const API = process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? getDevApiUrl() : 'http://localhost:4242');
import * as SecureStore from 'expo-secure-store';
const TOKEN_KEY = 'ah.accessToken';
const REFRESH_KEY = 'ah.refreshToken';
export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || 'Request failed');
  return body as T;
}
export async function saveToken(token: string) { await SecureStore.setItemAsync(TOKEN_KEY, token); }
export async function readToken() { return SecureStore.getItemAsync(TOKEN_KEY); }
export async function saveSession(accessToken: string, refreshToken?: string) {
  await saveToken(accessToken);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}
export async function readRefreshToken() { return SecureStore.getItemAsync(REFRESH_KEY); }
