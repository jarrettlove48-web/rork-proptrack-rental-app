import { useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { LightColors, DarkColors } from '@/constants/colors';

const THEME_KEY = 'proptrack_theme';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(val => {
      if (val !== null) {
        setIsDark(val === 'dark');
      } else {
        setIsDark(systemScheme === 'dark');
      }
    }).catch(() => {
      setIsDark(systemScheme === 'dark');
    });
  }, []);

  const toggleTheme = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light').catch(() => {
      console.log('Failed to save theme');
    });
  }, [isDark]);

  const colors = useMemo(() => isDark ? DarkColors : LightColors, [isDark]);

  return { isDark, toggleTheme, colors };
});
