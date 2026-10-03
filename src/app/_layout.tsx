import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold } from '@expo-google-fonts/ibm-plex-sans-arabic';
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { router, SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackHandler, Platform, View } from 'react-native';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DeleteDialog, Toast } from '../components/Overlays';
import { EmptyState, Skeleton, T } from '../components/ui';
import { useOnline } from '../lib/online';
import { NazzimProvider, useNazzim } from '../lib/store';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  const { C, ready, scheme, del, setDel } = useNazzim();
  const online = useOnline();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
    IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold,
  });
  // A font that fails or never arrives must not keep the app blank: render with the system face instead.
  // Before this, a blocked font request left the splash up forever, because the gate waited only on success.
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => { const t = setTimeout(() => setFontTimeout(true), 4000); return () => clearTimeout(t); }, []);
  const loaded = (fontsLoaded || !!fontError || fontTimeout) && ready;
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);
  // Android back closes the delete dialog before leaving the screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (del) { setDel(false); return true; } return false; });
    return () => sub.remove();
  }, [del, setDel]);
  // Native keeps the splash up until now; the web has no splash, so it gets a quiet outline of Today instead of
  // a blank page while storage and fonts load.
  if (!loaded) return Platform.OS === 'web' ? <Loading /> : null;
  return (
    // Toast and the delete dialog sit above every screen, including pushed ones (Profile, Settings, Plans).
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <ErrorBoundary where="screen" fallback={retry => <ScreenError retry={retry} />}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
      </ErrorBoundary>
      {!online && <OfflineBanner />}
      {del && <DeleteDialog />}
      <Toast />
    </View>
  );
}

function Loading() {
  const { C } = useNazzim();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 18, paddingTop: 64, gap: 14 }}>
      <Skeleton height={28} width="55%" radius={6} />
      <Skeleton height={190} radius={24} />
      <Skeleton height={18} width="40%" radius={6} />
      <Skeleton height={64} radius={16} />
      <Skeleton height={64} radius={16} />
    </View>
  );
}

// Offline is not an error in a local-first app, so this is a status line, not an alarm.
function OfflineBanner() {
  const { C, L, ar } = useNazzim();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" accessibilityRole="alert" accessibilityLiveRegion="polite"
      style={{ position: 'absolute', top: insets.top + 6, alignSelf: 'center', direction: ar ? 'rtl' : 'ltr', flexDirection: 'row', maxWidth: '92%', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: C.inv, boxShadow: C.shadowFloat }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.warning }} />
      <T w={700} s="caption" c={C.onInv}>{L.offT}</T>
      <T w={500} s="caption" c={C.onInv3}>{L.offS}</T>
    </View>
  );
}

// A screen crashed but the app shell is fine, so the fallback can speak the student's language and theme.
function ScreenError({ retry }: { retry: () => void }) {
  const { C, L, ar } = useNazzim();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 24, direction: ar ? 'rtl' : 'ltr' }}>
      <EmptyState icon="alert" title={L.errT} body={L.errS} action={{ label: L.errRetry, icon: 'reset', onPress: retry }}
        secondary={{ label: L.aBack, onPress: () => { retry(); if (router.canGoBack()) router.back(); else router.replace('/'); } }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    // Outermost so a crash in the provider itself still reaches a screen the student can read and recover from.
    <ErrorBoundary where="root">
      <SafeAreaProvider>
        <NazzimProvider>
          <Gate />
        </NazzimProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
