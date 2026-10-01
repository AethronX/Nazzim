import type { BottomTabBarProps } from 'expo-router/tabs';
import { View } from 'react-native';
import { useChrome } from '../lib/layout';
import { useNazzim } from '../lib/store';
import { Btn, Icon, T } from './ui';

// Today · Plan · Subjects · More. Planning lives inside Plan and Today, so there is no centre button.
const TABS = [
  { route: 'index', icon: 'home', label: 'tabToday' },
  { route: 'plan', icon: 'calendar', label: 'tabPlan' },
  { route: 'subjects', icon: 'books', label: 'tabSubjects' },
  { route: 'more', icon: 'menu', label: 'tabMore' },
] as const;

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { C, L, accent, ar } = useNazzim();
  const { tabPad } = useChrome();
  const current = state.routes[state.index]?.name;

  return (
    <View
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40,
        flexDirection: 'row', alignItems: 'flex-end', direction: ar ? 'rtl' : 'ltr',
        paddingTop: 8, paddingHorizontal: 14, paddingBottom: tabPad,
        backgroundColor: C.chrome, borderTopWidth: 1, borderTopColor: C.line,
      }}
    >
      {TABS.map(tab => {
        const on = current === tab.route;
        const color = on ? accent.fg : C.ink3;
        return (
          <Btn
            key={tab.route}
            label={L[tab.label]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => { if (!on) navigation.navigate(tab.route); }}
            pressScale={1}
            style={{ flex: 1, alignItems: 'center', gap: 4, paddingTop: 4 }}
          >
            <View style={{ width: 46, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? accent.tint : 'transparent' }}>
              <Icon name={tab.icon} size={21} color={color} stroke={1.9} />
            </View>
            <T w={700} s="micro" c={color}>{L[tab.label]}</T>
          </Btn>
        );
      })}
    </View>
  );
}
