import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { TenantProvider, useTenant } from "@/context/TenantContext";
import { handleOAuthDeepLink } from "@/lib/supabase";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function useDeepLinkHandler() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleUrl = (event: { url: string }) => {
      console.log('[DeepLink] Received URL:', event.url);
      if (event.url.includes('access_token') || event.url.includes('auth/callback')) {
        void handleOAuthDeepLink(event.url);
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    void Linking.getInitialURL().then((url) => {
      if (url && (url.includes('access_token') || url.includes('auth/callback'))) {
        console.log('[DeepLink] Initial URL has auth tokens:', url);
        void handleOAuthDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}

function useProtectedRoute() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isTenantRole, tenantSession, isLoading: tenantLoading } = useTenant();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || tenantLoading) return;

    const firstSegment = (segments as string[])[0];
    const inAuthScreen = firstSegment === 'auth';
    const inTenantAuth = firstSegment === 'tenant-auth';
    const inTenantPortal = firstSegment === 'tenant-portal';

    if (!isAuthenticated && !inAuthScreen && !inTenantAuth) {
      console.log('[Router] Not authenticated, redirecting to auth');
      router.replace('/auth' as never);
      return;
    }

    if (isAuthenticated && isTenantRole && tenantSession) {
      if (!inTenantPortal) {
        console.log('[Router] Tenant with session, redirecting to portal');
        router.replace('/tenant-portal' as never);
      }
      return;
    }

    if (isAuthenticated && isTenantRole && !tenantSession) {
      if (!inTenantAuth) {
        console.log('[Router] Tenant without session, redirecting to tenant-auth');
        router.replace('/tenant-auth' as never);
      }
      return;
    }

    if (isAuthenticated && !isTenantRole && (inAuthScreen || inTenantAuth)) {
      console.log('[Router] Landlord authenticated, redirecting to home');
      router.replace('/' as never);
    }
  }, [isAuthenticated, authLoading, tenantLoading, isTenantRole, tenantSession, segments, router]);
}

function RootLayoutNav() {
  const { colors } = useTheme();
  useDeepLinkHandler();
  useProtectedRoute();

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' as const, fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="tenant-auth" options={{ headerShown: false }} />
      <Stack.Screen name="tenant-portal" options={{ headerShown: false }} />
      <Stack.Screen name="add-property" options={{ presentation: "modal", title: "Add Property" }} />
      <Stack.Screen name="add-unit" options={{ presentation: "modal", title: "Add Unit" }} />
      <Stack.Screen name="submit-request" options={{ presentation: "modal", title: "New Request" }} />
      <Stack.Screen name="request-detail" options={{ title: "Request Detail" }} />
      <Stack.Screen name="edit-property" options={{ presentation: "modal", title: "Edit Property" }} />
      <Stack.Screen name="edit-unit" options={{ presentation: "modal", title: "Edit Unit" }} />
      <Stack.Screen name="tenant-profile" options={{ title: "Tenant Profile" }} />
      <Stack.Screen name="add-expense" options={{ presentation: "modal", title: "Add Expense" }} />
      <Stack.Screen name="invite-tenant" options={{ presentation: "modal", title: "Invite Tenant" }} />
      <Stack.Screen name="paywall" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="reports" options={{ title: "Reports & Analytics" }} />
      <Stack.Screen name="calendar" options={{ title: "Calendar" }} />
      <Stack.Screen name="notification-settings" options={{ title: "Notifications" }} />
      <Stack.Screen name="bulk-tenants" options={{ title: "Manage Tenants" }} />
      <Stack.Screen name="contractors" options={{ title: "Contractors" }} />
      <Stack.Screen name="privacy-policy" options={{ title: "Privacy Policy" }} />
      <Stack.Screen name="contractor-portal" options={{ headerShown: false }} />
      <Stack.Screen name="cancel-subscription" options={{ presentation: "modal", title: "Cancel Membership" }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <ThemeProvider>
            <SubscriptionProvider>
              <DataProvider>
                <TenantProvider>
                  <RootLayoutNav />
                </TenantProvider>
              </DataProvider>
            </SubscriptionProvider>
          </ThemeProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
