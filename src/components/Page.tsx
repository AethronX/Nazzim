import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChrome } from '../lib/layout';
import { useNazzim } from '../lib/store';
import { Btn, Eyebrow, Icon, T, type IconName } from './ui';

// A pushed screen (Profile, Settings, Plans): back button, large title, scrolling body.
export function Page({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  const { C, L, ar } = useNazzim();
  const { headerTop } = useChrome();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, direction: ar ? 'rtl' : 'ltr' }}>
      <View style={{ paddingTop: headerTop - 6, paddingHorizontal: 12, paddingBottom: 12, backgroundColor: C.header, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <Btn label={L.aBack} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} pressScale={0.94} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          {/* The chevron points "forward"; flip it to point back in each writing direction. */}
          <Icon name="chevron" size={22} color={C.ink} stroke={2.4} flip={!ar} />
        </Btn>
        <View style={{ paddingHorizontal: 6, marginTop: 2 }}>
          <T f="display" w={700} s={28} ls={ar ? 0 : -0.9} accessibilityRole="header">{title}</T>
          {!!sub && <T w={600} s={12} c={C.ink3} style={{ marginTop: 3 }}>{sub}</T>}
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: Math.max(insets.bottom, 16) + 28, gap: 12 }}>
        {children}
      </ScrollView>
    </View>
  );
}

export function Section({ label, children }: { label?: string; children: ReactNode }) {
  const { C } = useNazzim();
  return (
    <View style={{ gap: 8, marginTop: label ? 8 : 0 }}>
      {!!label && <View style={{ paddingHorizontal: 4 }}><Eyebrow>{label}</Eyebrow></View>}
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

type RowProps = {
  icon?: IconName; title: string; sub?: string; right?: ReactNode; onPress?: () => void;
  danger?: boolean; last?: boolean; chevron?: boolean; style?: StyleProp<ViewStyle>; children?: ReactNode;
};

// One settings row. Pass onPress for a tappable row (a chevron shows unless `right` is given).
export function Row({ icon, title, sub, right, onPress, danger, last, chevron, style, children }: RowProps) {
  const { C, ar } = useNazzim();
  const tint = danger ? C.danger : C.ink2;
  const body = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {!!icon && <Icon name={icon} size={18} color={tint} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w={600} s={14} c={danger ? C.danger : C.ink}>{title}</T>
          {!!sub && <T w={600} s={11} c={C.ink3} style={{ marginTop: 2 }}>{sub}</T>}
        </View>
        {right}
        {(chevron ?? (!!onPress && !right)) && <Icon name="chevron" size={15} color={C.ink3} stroke={2.3} flip={ar} />}
      </View>
      {children}
    </>
  );
  const base = [{ paddingVertical: 14, paddingHorizontal: 16, gap: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line2 }, style];
  return onPress
    ? <Btn pressScale={1} onPress={onPress} style={base}>{body}</Btn>
    : <View style={base}>{body}</View>;
}

// Pill options (appearance, focus length, habit time…). Selected = blue wash with Blue 600 text.
export function Choice<V extends string | number>({ options, value, onChange, labels, mono }: {
  options: readonly V[]; value: V; onChange: (v: V) => void; labels: readonly string[]; mono?: boolean;
}) {
  const { C, accent } = useNazzim();
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityRole="radiogroup">
      {options.map((o, i) => {
        const on = o === value;
        return (
          <Btn key={String(o)} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(o)}
            style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 99, backgroundColor: on ? accent.tint : 'transparent' }}>
            <T f={mono ? 'grotesk' : 'body'} w={700} s={11} c={on ? accent.strong : C.ink3}>{labels[i]}</T>
          </Btn>
        );
      })}
    </View>
  );
}

// Initials on the midnight brand surface, with the Blue 300 "now" dot from the logo.
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { C } = useNazzim();
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '·';
  const dot = Math.round(size * 0.22);
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.hero, alignItems: 'center', justifyContent: 'center' }}>
        {/* No name yet: a person glyph, never a stray dot */}
        {name.trim()
          ? <T f="display" w={700} s={size * 0.4} c={C.onHero} style={{ textAlign: 'center' }}>{initials}</T>
          : <Icon name="user" size={size * 0.46} color={C.onHero} />}
      </View>
      <View style={{ position: 'absolute', top: 0, end: 0, width: dot, height: dot, borderRadius: dot, backgroundColor: C.onHeroAccent, borderWidth: Math.max(2, size * 0.04), borderColor: C.bg }} />
    </View>
  );
}
