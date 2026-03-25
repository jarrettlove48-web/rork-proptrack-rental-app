import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Building2, Wrench, MessageCircle, User, Receipt } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useData } from '@/context/DataContext';

export default function TabLayout() {
  const { colors } = useTheme();
  const { openRequestCount } = useData();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.borderLight,
          borderTopWidth: 0.5,
          ...(Platform.OS === 'web' ? { height: 60 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600' as const,
          letterSpacing: 0.3,
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="(properties)"
        options={{
          title: 'Properties',
          tabBarIcon: ({ color, size }) => <Building2 size={size - 2} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color, size }) => <Wrench size={size - 2} color={color} strokeWidth={1.8} />,
          tabBarBadge: openRequestCount > 0 ? openRequestCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.statusOpen,
            fontSize: 10,
            fontWeight: '700' as const,
            minWidth: 18,
            height: 18,
            lineHeight: 18,
          },
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, size }) => <Receipt size={size - 2} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size - 2} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <User size={size - 2} color={color} strokeWidth={1.8} />,
        }}
      />
    </Tabs>
  );
}
