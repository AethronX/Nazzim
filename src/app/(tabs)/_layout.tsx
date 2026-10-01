import { Redirect, Tabs, router, usePathname } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { View } from 'react-native';
import { MiniTimer, Splash } from '../../components/Overlays';
import { QuickAdd } from '../../components/QuickAdd';
import { TabBar } from '../../components/TabBar';
import { remindersSupported } from '../../lib/reminders';
import { useNazzim } from '../../lib/store';

const MAX_WIDTH = 680;

export default function TabsLayout() {
  const { C, timer, quick, ready, onboarded } = useNazzim();
  const pathname = usePathname();
  const [splash, setSplash] = useState(true);
  const hideSplash = useCallback(() => setSplash(false), []);
  const onFocus = pathname === '/focus';

  // Tapping a reminder opens the screen it is about (focus, plan or progress).
  useEffect(() => {
    if (!remindersSupported) return;
    const open = (url: unknown) => { if (url === '/' || url === '/focus' || url === '/plan' || url === '/progress') router.navigate(url); };
    Notifications.getLastNotificationResponseAsync().then(r => open(r?.notification.request.content.data?.url)).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(r => open(r.notification.request.content.data?.url));
    return () => sub.remove();
  }, []);

  if (ready && !onboarded) return <Redirect href="/welcome" />;

  return (
    // Tablet: one readable column (max 680pt) centred on the canvas, like Things and Todoist on iPad.
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: MAX_WIDTH, backgroundColor: C.bg }}>
        <Tabs
          tabBar={props => <TabBar {...props} />}
          screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg }, animation: 'fade' }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="plan" />
          <Tabs.Screen name="subjects" />
          <Tabs.Screen name="more" />
        </Tabs>
        {timer.running && !onFocus && <MiniTimer onPress={() => router.navigate('/focus')} />}
        {quick && <QuickAdd />}
        {splash && <Splash onDone={hideSplash} />}
      </View>
    </View>
  );
}
