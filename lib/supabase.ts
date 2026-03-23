import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
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
  if (Platform.OS === 'web') {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://rork.com';
    const redirectUrl = `${origin}/auth/callback`;
    console.log('[OAuth] Web redirect URL:', redirectUrl);
    return redirectUrl;
  }

  const redirectUrl = makeRedirectUri({
    scheme: 'proptrack',
    path: 'auth/callback',
  });
  console.log('[OAuth] Native redirect URL:', redirectUrl);
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
    console.log('[OAuth] Listening for redirect to:', redirectUrl);

    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl,
      {
        showInRecents: true,
        preferEphemeralSession: false,
      }
    );

    console.log('[OAuth] Browser result type:', result.type);

    if (result.type === 'success' && result.url) {
      console.log('[OAuth] Got callback URL, extracting tokens...');
      console.log('[OAuth] Full callback URL:', result.url);

      const tokens = extractTokensFromUrl(result.url);

      if (tokens.accessToken && tokens.refreshToken) {
        console.log('[OAuth] Setting session with tokens...');
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });

        if (sessionError) {
          console.log('[OAuth] Error setting session:', sessionError.message);
          return false;
        }

        console.log('[OAuth] Session set successfully!');
        return true;
      } else {
        console.log('[OAuth] Could not extract tokens from callback URL');
        console.log('[OAuth] Attempting to check session directly...');
        
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          console.log('[OAuth] Session found via getSession fallback!');
          return true;
        }

        console.log('[OAuth] No session found after OAuth callback');
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

function extractTokensFromUrl(url: string): { accessToken: string; refreshToken: string } {
  let accessToken = '';
  let refreshToken = '';

  try {
    const parsed = new URL(url);
    
    const hashParams = new URLSearchParams(parsed.hash.replace('#', ''));
    accessToken = hashParams.get('access_token') ?? '';
    refreshToken = hashParams.get('refresh_token') ?? '';

    if (!accessToken) {
      accessToken = parsed.searchParams.get('access_token') ?? '';
      refreshToken = parsed.searchParams.get('refresh_token') ?? '';
    }
  } catch {
    console.log('[OAuth] URL parsing failed, trying regex fallback');
  }

  if (!accessToken && url.includes('access_token=')) {
    const fragmentMatch = url.match(/access_token=([^&]+)/);
    const refreshMatch = url.match(/refresh_token=([^&]+)/);
    accessToken = fragmentMatch?.[1] ?? '';
    refreshToken = refreshMatch?.[1] ?? '';
  }

  if (!accessToken && url.includes('#')) {
    const fragment = url.split('#')[1] ?? '';
    const params = new URLSearchParams(fragment);
    accessToken = params.get('access_token') ?? '';
    refreshToken = params.get('refresh_token') ?? '';
  }

  console.log('[OAuth] Token extraction result:', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    accessTokenLength: accessToken.length,
  });

  return { accessToken, refreshToken };
}

export function handleOAuthDeepLink(url: string): Promise<boolean> {
  console.log('[OAuth] Handling deep link:', url);
  const tokens = extractTokensFromUrl(url);

  if (tokens.accessToken && tokens.refreshToken) {
    return supabase.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    }).then(({ error }) => {
      if (error) {
        console.log('[OAuth] Deep link session error:', error.message);
        return false;
      }
      console.log('[OAuth] Deep link session set successfully!');
      return true;
    });
  }

  return Promise.resolve(false);
}
