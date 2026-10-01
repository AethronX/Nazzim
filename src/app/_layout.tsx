import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold } from '@expo-google-fonts/ibm-plex-sans-arabic';
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BackHandler, View } from 'react-native';
import { DeleteDialog, Toast } from '../components/Overlays';
import { NazzimProvider, useNazzim } from '../lib/store';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  const { C, ready, scheme, del, setDel } = useNazzim();
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
    IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold,
  });
  const loaded = fontsLoaded && ready;
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);
  // Android back closes the delete dialog before leaving the screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (del) { setDel(false); return true; } return false; });
    return () => sub.remove();
  }, [del, setDel]);
  if (!loaded) return null;
  return (
    // Toast and the delete dialog sit above every screen, including pushed ones (Profile, Settings, Plans).
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
      {del && <DeleteDialog />}
      <Toast />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <NazzimProvider>
        <Gate />
      </NazzimProvider>
    </SafeAreaProvider>
  );
}
