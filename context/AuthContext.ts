import { useEffect, useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  useEffect(() => {
    console.log('[Auth] Checking initial session...');
    supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      if (error) {
        console.log('[Auth] Session restore error:', error.message);
        if (
          error.message.includes('Refresh Token') ||
          error.message.includes('Invalid Refresh Token') ||
          error.message.includes('token')
        ) {
          console.log('[Auth] Invalid refresh token, signing out to clear stale session');
          supabase.auth.signOut().catch(() => {});
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }
      }
      console.log('[Auth] Initial session:', s ? 'found' : 'none');
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    }).catch((err) => {
      console.log('[Auth] Error getting session:', err);
      setSession(null);
      setUser(null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      console.log('[Auth] Auth state changed:', _event, s ? 'session' : 'no session');
      if (_event === 'TOKEN_REFRESHED' && !s) {
        console.log('[Auth] Token refresh failed, clearing session');
        setSession(null);
        setUser(null);
        queryClient.clear();
        return;
      }
      setSession(s);
      setUser(s?.user ?? null);
      if (_event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsSigningIn(true);
    try {
      console.log('[Auth] Signing in...');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.log('[Auth] Sign in error:', error.message);
        Alert.alert('Sign In Failed', error.message);
        return false;
      }
      console.log('[Auth] Sign in successful');
      return true;
    } catch (err) {
      console.log('[Auth] Sign in exception:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    setIsSigningUp(true);
    try {
      console.log('[Auth] Signing up...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) {
        console.log('[Auth] Sign up error:', error.message);
        Alert.alert('Sign Up Failed', error.message);
        return false;
      }
      console.log('[Auth] Sign up successful, user:', data.user?.id);
      console.log('[Auth] Email confirmed:', data.user?.email_confirmed_at);
      console.log('[Auth] Session:', data.session ? 'exists' : 'none');
      if (data.user && !data.session) {
        Alert.alert(
          'Check Your Email',
          'We sent a confirmation link to your email. Please verify your account to sign in.',
        );
      } else if (data.session) {
        Alert.alert('Welcome!', 'Your account has been created successfully.');
      }
      return true;
    } catch (err) {
      console.log('[Auth] Sign up exception:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      return false;
    } finally {
      setIsSigningUp(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log('[Auth] Signing out...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log('[Auth] Sign out error:', error.message);
        if (
          error.message.includes('Refresh Token') ||
          error.message.includes('token')
        ) {
          console.log('[Auth] Stale token during sign out, forcing local cleanup');
          setSession(null);
          setUser(null);
          queryClient.clear();
          return;
        }
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
    } catch (err) {
      console.log('[Auth] Sign out exception, forcing local cleanup:', err);
      setSession(null);
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        Alert.alert('Error', error.message);
        return false;
      }
      Alert.alert('Check Your Email', 'A password reset link has been sent to your email.');
      return true;
    } catch {
      Alert.alert('Error', 'An unexpected error occurred.');
      return false;
    }
  }, []);

  return useMemo(() => ({
    session,
    user,
    isLoading,
    isSigningIn,
    isSigningUp,
    isAuthenticated: !!session,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }), [session, user, isLoading, isSigningIn, isSigningUp, signIn, signUp, signOut, resetPassword]);
});
