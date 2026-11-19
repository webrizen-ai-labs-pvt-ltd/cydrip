import { Barlow_400Regular } from '@expo-google-fonts/barlow/400Regular';
import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_600SemiBold } from '@expo-google-fonts/barlow/600SemiBold';
import { BarlowCondensed_500Medium } from '@expo-google-fonts/barlow-condensed/500Medium';
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { getDb } from '@/lib/db';
import { loadSettings } from '@/lib/settings';
// Importing the tracker also registers the background GPS task before any screen renders.
import { reconcileRide } from '@/lib/tracker';
import { colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.paper,
    background: colors.ink,
    card: colors.ink,
    text: colors.paper,
    border: colors.kerb,
  },
};

export default function RootLayout() {
  const [loaded] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    BarlowCondensed_500Medium,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
  });

  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Open storage, restore settings and any ride in progress before the first screen renders.
    Promise.all([getDb(), loadSettings(), reconcileRide()])
      .catch((e) => console.warn('[cydrip] startup failed', e))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (loaded && ready) SplashScreen.hideAsync();
  }, [loaded, ready]);

  if (!loaded || !ready) return null;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.ink },
          headerTintColor: colors.paper,
          headerTitleStyle: { fontFamily: fonts.bodySemi },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.ink },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ride/[id]" options={{ title: '' }} />
        <Stack.Screen name="snap/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
    </ThemeProvider>
  );
}
