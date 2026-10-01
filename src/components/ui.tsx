import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo, Animated, Easing, Pressable, Text, View,
  type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import type { Kind } from '../lib/copy';
import { useNazzim } from '../lib/store';
import { font, type Face, type Weight } from '../lib/theme';

type TProps = TextProps & {
  f?: Face; w?: Weight; s?: number; c?: string; ls?: number; lh?: number; style?: StyleProp<TextStyle>;
};

// Text with the design's font stacks resolved for the current language.
export function T({ f = 'body', w = 500, s = 14, c, ls, lh, style, ...rest }: TProps) {
  const { ar, C } = useNazzim();
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      {...rest}
      style={[
        { fontFamily: font(f, w, ar), fontSize: s, color: c ?? C.ink, letterSpacing: ls, lineHeight: lh ? s * lh : undefined, writingDirection: ar && f !== 'grotesk' ? 'rtl' : 'ltr', textAlign: ar ? 'right' : undefined },
        style,
      ]}
    />
  );
}

type BtnProps = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; pressScale?: number; label?: string; pressedBg?: string };

// pressedBg: solid buttons darken to this colour when pressed; others dim slightly.
export function Btn({ style, pressScale = 0.98, label, pressedBg, children, ...rest }: BtnProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      {...rest}
      style={({ pressed }) => [style, pressed && (pressedBg ? { transform: [{ scale: pressScale }], backgroundColor: pressedBg } : { transform: [{ scale: pressScale }], opacity: 0.92 })]}
    >
      {children}
    </Pressable>
  );
}

// nzFade: opacity 0→1, translateY 10→0.
export function FadeIn({ children, style, duration = 260, delay = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; duration?: number; delay?: number }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (cancelled) return;
      if (reduce) v.setValue(1);
      else Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    }).catch(() => v.setValue(1));
    return () => { cancelled = true; };
  }, [v, duration, delay]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// nzBreath: a soft ring pulsing out of a dot.
export function BreathDot({ size, color, ring }: { size: number; color: string; ring: string }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (reduce) return;
      loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
      loop.start();
    }).catch(() => {});
    return () => loop?.stop();
  }, [v]);
  const scale = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1 + 20 / size, 1] });
  const opacity = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.25, 0, 0] });
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size, backgroundColor: ring, opacity, transform: [{ scale }] }} />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}

// Shape-per-kind markers: square = class, circle = task, ring = focus, diamond = habit.
export function Marker({ kind, done = false }: { kind: Kind; done?: boolean }) {
  const { accent, C } = useNazzim();
  if (kind === 'class') return <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: C.ink }} />;
  if (kind === 'focus') return <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: accent.a1, backgroundColor: C.card }} />;
  if (kind === 'habit') {
    return (
      <View style={{ width: 9, height: 9, marginVertical: 1.5, transform: [{ rotate: '45deg' }], borderWidth: 2, borderColor: accent.a1, backgroundColor: done ? accent.a1 : C.card }} />
    );
  }
  return <View style={{ width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: done ? accent.a1 : C.ink2, backgroundColor: done ? accent.a1 : C.card }} />;
}

export type IconName =
  | 'flame' | 'play' | 'sparkle' | 'check' | 'arrow' | 'chevron' | 'reset' | 'skip' | 'sound' | 'lock'
  | 'globe' | 'contrast' | 'bell' | 'trash' | 'crown' | 'clock' | 'calendar' | 'target' | 'bars' | 'plus' | 'pause'
  | 'user' | 'gear' | 'pencil' | 'shield' | 'doc' | 'help' | 'vibrate' | 'palette'
  | 'home' | 'books' | 'menu' | 'chart' | 'function' | 'atom' | 'code' | 'book' | 'flask' | 'pen' | 'alert' | 'exam';

type IconProps = { name: IconName; size?: number; color?: string; stroke?: number; flip?: boolean };

// Stroke icons copied from the design's inline SVGs (24×24 viewBox).
export function Icon({ name, size = 18, color: colorProp, stroke = 2, flip }: IconProps) {
  const { C } = useNazzim();
  const color = colorProp ?? C.ink2;
  const p = { stroke: color, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const body = (() => {
    switch (name) {
      case 'flame': return <Path {...p} d="M12 22c4 0 6.5-2.6 6.5-6 0-4.2-4-6.4-4.6-11-2.2 1.6-3.2 3.8-3.2 5.6 0 1.6-1 2.4-1.9 2.4-1 0-1.8-.7-1.8-2C4.9 13 5.5 22 12 22Z" />;
      case 'play': return <Path fill={color} d="M8 5.2l11 6.8-11 6.8z" />;
      case 'pause': return <><Rect fill={color} x={6.5} y={5} width={4.2} height={14} rx={1.3} /><Rect fill={color} x={13.3} y={5} width={4.2} height={14} rx={1.3} /></>;
      case 'sparkle': return <Path {...p} d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />;
      case 'check': return <Path {...p} d="M5 12.5l4.5 4.5L19 7" />;
      case 'arrow': return <Path {...p} d="M5 12h14M13 6l6 6-6 6" />;
      case 'chevron': return <Path {...p} d="M9 6l6 6-6 6" />;
      case 'reset': return <><Path {...p} d="M4 12a8 8 0 1 0 2.8-6.1" /><Path {...p} d="M4 4.5V10h5.2" /></>;
      case 'skip': return <><Path {...p} d="M6 5.5l9 6.5-9 6.5z" /><Path {...p} d="M18.5 5.5v13" /></>;
      case 'sound': return <Path {...p} d="M3 10v4M7 7v10M11 4v16M15 8v8M19 11v2" />;
      case 'lock': return <><Rect {...p} x={5} y={10.5} width={14} height={10} rx={2.5} /><Path {...p} d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" /></>;
      case 'globe': return <><Circle {...p} cx={12} cy={12} r={8.5} /><Path {...p} d="M3.5 12h17M12 3.5c2.4 2.3 2.4 14 0 17M12 3.5c-2.4 2.3-2.4 14 0 17" /></>;
      case 'contrast': return <><Circle {...p} cx={12} cy={12} r={8.5} /><Path fill={color} d="M12 3.5a8.5 8.5 0 0 1 0 17z" /></>;
      case 'user': return <><Circle {...p} cx={12} cy={8.5} r={3.8} /><Path {...p} d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></>;
      case 'gear': return <><Circle {...p} cx={12} cy={12} r={3} /><Path {...p} d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" /></>;
      case 'pencil': return <Path {...p} d="M5 19l1-4.2L15.8 5a2 2 0 0 1 2.9 0l.3.3a2 2 0 0 1 0 2.9L9.2 18 5 19z" />;
      case 'shield': return <Path {...p} d="M12 3.5 5 6v5.5c0 4.3 2.9 7.6 7 9 4.1-1.4 7-4.7 7-9V6z" />;
      case 'doc': return <><Path {...p} d="M7 3.5h7l4 4v13H7z" /><Path {...p} d="M13.5 3.5V8H18M9.5 12.5h6M9.5 16h6" /></>;
      case 'help': return <><Circle {...p} cx={12} cy={12} r={8.5} /><Path {...p} d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6M12 16.8v.2" /></>;
      case 'vibrate': return <><Rect {...p} x={8} y={4} width={8} height={16} rx={2} /><Path {...p} d="M4.5 9v6M19.5 9v6" /></>;
      case 'palette': return <><Path {...p} d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1.1-1.6-1.1-2.8 0-1 .8-1.7 1.8-1.7h2.2a3.8 3.8 0 0 0 3.8-3.8c0-3.9-3.8-7-8.5-7z" /><Circle fill={color} cx={8} cy={10} r={1.2} /><Circle fill={color} cx={11.5} cy={7.2} r={1.2} /><Circle fill={color} cx={15.5} cy={8.6} r={1.2} /></>;
      case 'home': return <Path {...p} d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />;
      case 'books': return <><Rect {...p} x={4} y={4.5} width={5} height={15} rx={1.2} /><Rect {...p} x={10.5} y={4.5} width={5} height={15} rx={1.2} /><Path {...p} d="M17 6l3 13" /></>;
      case 'menu': return <Path {...p} d="M5 7h14M5 12h14M5 17h14" />;
      case 'chart': return <><Path {...p} d="M5 19V5M5 19h14" /><Path {...p} d="M9 15v-3M13 15V9M17 15v-5" /></>;
      case 'function': return <Path {...p} d="M15 4.5c-2.2-.6-3.6.6-4 2.6L9.2 17c-.4 2-1.8 3.1-4 2.5M7 10h7" />;
      case 'atom': return <><Circle fill={color} cx={12} cy={12} r={1.6} /><Path {...p} d="M12 3.5c3 0 5 3.8 5 8.5s-2 8.5-5 8.5-5-3.8-5-8.5 2-8.5 5-8.5z" /><Path {...p} d="M4.6 7.8c1.5-2.6 5.8-2.3 9.9.1s6.4 6.1 4.9 8.7-5.8 2.3-9.9-.1-6.4-6.1-4.9-8.7z" /></>;
      case 'code': return <Path {...p} d="M9 7l-5 5 5 5M15 7l5 5-5 5" />;
      case 'book': return <Path {...p} d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v14H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19" />;
      case 'flask': return <><Path {...p} d="M10 3.5h4M10.5 3.5v5.5L5.5 18a1.8 1.8 0 0 0 1.6 2.5h9.8a1.8 1.8 0 0 0 1.6-2.5l-5-9V3.5" /><Path {...p} d="M8 14h8" /></>;
      case 'pen': return <><Path {...p} d="M4.5 19.5h15" /><Path {...p} d="M7 16l1-3.6L15.4 5a1.6 1.6 0 0 1 2.3 0l.3.3a1.6 1.6 0 0 1 0 2.3L10.6 15z" /></>;
      case 'alert': return <><Circle {...p} cx={12} cy={12} r={8.5} /><Path {...p} d="M12 7.5v5.2M12 16.3v.2" /></>;
      case 'exam': return <><Rect {...p} x={5} y={4} width={14} height={17} rx={2} /><Path {...p} d="M9 4V3h6v1M8.5 10h7M8.5 14h4.5" /></>;
      case 'bell': return <><Path {...p} d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14z" /><Path {...p} d="M10 21h4" /></>;
      case 'trash': return <Path {...p} d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12.5h10L18 7M9 7V4.5h6V7" />;
      case 'crown': return <Path {...p} d="M3 8l4 3.5L12 4l5 7.5L21 8l-1.8 11H4.8z" />;
      case 'clock': return <><Circle {...p} cx={12} cy={12} r={8.5} /><Path {...p} d="M12 7.5V12l3 2" /></>;
      case 'calendar': return <><Path {...p} d="M4 6.5h16v13.5H4z" /><Path {...p} d="M4 10.5h16M8.5 4v4M15.5 4v4" /></>;
      case 'target': return <><Circle {...p} cx={12} cy={12} r={8.5} /><Circle {...p} cx={12} cy={12} r={3.5} /></>;
      case 'bars': return <Path {...p} d="M5 19V11M12 19V5M19 19v-6" />;
      case 'plus': return <Path {...p} d="M12 5v14M5 12h14" />;
    }
  })();
  return (
    <View style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Svg width={size} height={size} viewBox="0 0 24 24">{body}</Svg>
    </View>
  );
}

// iOS-style switch; the off track uses C.control so its state meets 3:1 (WCAG 1.4.11).
export function Toggle({ on, onPress, label, disabled }: { on: boolean; onPress: () => void; label: string; disabled?: boolean }) {
  const { C, accent, ar } = useNazzim();
  return (
    <Btn
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      pressScale={1}
      style={{ width: 44, height: 26, borderRadius: 99, padding: 3, backgroundColor: on ? accent.a1 : C.control, opacity: disabled ? 0.45 : 1 }}
    >
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.onAccent, boxShadow: '0 1px 3px rgba(0,0,0,.2)', transform: [{ translateX: on ? (ar ? -18 : 18) : 0 }] }} />
    </Btn>
  );
}

// Header band shared by Today / Plan / Progress: translucent white with a hairline.
export function Header({ top, children, pb = 13 }: { top: number; children: ReactNode; pb?: number }) {
  const { C } = useNazzim();
  return (
    <View style={{ paddingTop: top, paddingHorizontal: 18, paddingBottom: pb, backgroundColor: C.header, borderBottomWidth: 1, borderBottomColor: C.line }}>
      {children}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { C } = useNazzim();
  return <View style={[{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, overflow: 'hidden' }, style]}>{children}</View>;
}

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  const { C } = useNazzim();
  return <T w={800} s={10.5} ls={0.8} c={color ?? C.ink3}>{children}</T>;
}

// The one primary action on a screen: full width, indigo, white label.
export function PrimaryBtn({ title, onPress, disabled, icon }: { title: string; onPress: () => void; disabled?: boolean; icon?: IconName }) {
  const { C, accent } = useNazzim();
  return (
    <Btn onPress={onPress} disabled={disabled} pressedBg={accent.strong} accessibilityState={{ disabled: !!disabled }}
      style={{ flexDirection: 'row', gap: 8, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: disabled ? C.line2 : accent.a1, boxShadow: disabled ? undefined : accent.glow }}>
      {!!icon && <Icon name={icon} size={15} color={disabled ? C.ink3 : C.onAccent} stroke={2.4} />}
      <T w={800} s={15} c={disabled ? C.ink3 : C.onAccent}>{title}</T>
    </Btn>
  );
}
