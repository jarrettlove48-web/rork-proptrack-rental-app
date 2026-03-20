import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing URL or anon key — check your environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function getOAuthRedirectUrl() {
  const redirectUrl = Linking.createURL('auth/callback');
  console.log('[OAuth] Redirect URL:', redirectUrl);
  return redirectUrl;
}

export async function signInWithGoogleOAuth(): Promise<boolean> {
  try {
    const redirectUrl = getOAuthRedirectUrl();
    console.log('[OAuth] Starting Google OAuth flow...');
    console.log('[OAuth] Redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.log('[OAuth] Error getting OAuth URL:', error.message);
      return false;
    }

    if (!data?.url) {
      console.log('[OAuth] No OAuth URL returned');
      return false;
    }

    console.log('[OAuth] Opening browser for authentication...');
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl,
      { showInRecents: true }
    );

    console.log('[OAuth] Browser result type:', result.type);

    if (result.type === 'success' && result.url) {
      console.log('[OAuth] Got callback URL, extracting tokens...');
      const url = new URL(result.url);

      let accessToken = '';
      let refreshToken = '';

      const hashParams = new URLSearchParams(url.hash.replace('#', ''));
      accessToken = hashParams.get('access_token') ?? '';
      refreshToken = hashParams.get('refresh_token') ?? '';

      if (!accessToken) {
        accessToken = url.searchParams.get('access_token') ?? '';
        refreshToken = url.searchParams.get('refresh_token') ?? '';
      }

      if (!accessToken && result.url.includes('access_token=')) {
        const fragmentMatch = result.url.match(/access_token=([^&]+)/);
        const refreshMatch = result.url.match(/refresh_token=([^&]+)/);
        accessToken = fragmentMatch?.[1] ?? '';
        refreshToken = refreshMatch?.[1] ?? '';
      }

      if (accessToken && refreshToken) {
        console.log('[OAuth] Setting session with tokens...');
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.log('[OAuth] Error setting session:', sessionError.message);
          return false;
        }

        console.log('[OAuth] Session set successfully!');
        return true;
      } else {
        console.log('[OAuth] Could not extract tokens from callback URL');
        console.log('[OAuth] URL:', result.url);
        return false;
      }
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      console.log('[OAuth] User cancelled or dismissed the auth flow');
      return false;
    }

    return false;
  } catch (err) {
    console.log('[OAuth] Exception during Google OAuth:', err);
    return false;
  } finally {
    if (Platform.OS === 'ios') {
      void WebBrowser.dismissBrowser();
    }
  }
}
