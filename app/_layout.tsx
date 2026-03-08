import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function useProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthScreen = (segments as string[])[0] === 'auth';

    if (!isAuthenticated && !inAuthScreen) {
      console.log('[Router] Not authenticated, redirecting to auth');
      router.replace('/auth' as never);
    } else if (isAuthenticated && inAuthScreen) {
      console.log('[Router] Authenticated, redirecting to home');
      router.replace('/' as never);
    }
  }, [isAuthenticated, isLoading, segments, router]);
}

function RootLayoutNav() {
  const { colors } = useTheme();
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
      <Stack.Screen name="add-property" options={{ presentation: "modal", title: "Add Property" }} />
      <Stack.Screen name="add-unit" options={{ presentation: "modal", title: "Add Unit" }} />
      <Stack.Screen name="submit-request" options={{ presentation: "modal", title: "New Request" }} />
      <Stack.Screen name="request-detail" options={{ title: "Request Detail" }} />
      <Stack.Screen name="edit-property" options={{ presentation: "modal", title: "Edit Property" }} />
      <Stack.Screen name="edit-unit" options={{ presentation: "modal", title: "Edit Unit" }} />
      <Stack.Screen name="tenant-profile" options={{ title: "Tenant Profile" }} />
      <Stack.Screen name="add-expense" options={{ presentation: "modal", title: "Add Expense" }} />
      <Stack.Screen name="invite-tenant" options={{ presentation: "modal", title: "Invite Tenant" }} />
      <Stack.Screen name="tenant-portal" options={{ title: "Tenant Portal" }} />
      <Stack.Screen name="paywall" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView>
        <AuthProvider>
          <ThemeProvider>
            <SubscriptionProvider>
              <DataProvider>
                <RootLayoutNav />
              </DataProvider>
            </SubscriptionProvider>
          </ThemeProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
