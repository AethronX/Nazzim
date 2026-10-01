import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AccessibilityInfo, Animated, Easing, Pressable, View } from 'react-native';
import { useChrome } from '../lib/layout';
import { useNazzim } from '../lib/store';
import { LogoMark } from './Logo';
import { Btn, FadeIn, T } from './ui';

const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

// Launch screen on the midnight brand surface, shown briefly on every launch. The native splash is plain
// midnight, so the mark draws itself here: the bowl of ن is traced like a pen stroke, the dot drops in with a
// small bounce, then the name and tagline rise in. Fades out on its own; a tap skips it.
const HOLD_MS = 700;

export function Splash({ onDone }: { onDone: () => void }) {
  const { C, L, ar } = useNazzim();
  const [draw] = useState(() => new Animated.Value(0));
  const [drop] = useState(() => new Animated.Value(0));
  const [name] = useState(() => new Animated.Value(0));
  const [rest] = useState(() => new Animated.Value(0));
  const [out] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let finished = false;
    const finish = () => { if (!finished) { finished = true; onDone(); } };
    let t: ReturnType<typeof setTimeout> | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (reduce) { [draw, drop, name, rest].forEach(v => v.setValue(1)); t = setTimeout(finish, 1600); return; }
      Animated.sequence([
        Animated.parallel([
          // Stroke length can't use the native driver; the rest can.
          Animated.timing(draw, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
          Animated.sequence([
            Animated.delay(430),
            Animated.spring(drop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(720),
            Animated.timing(name, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(980),
            Animated.timing(rest, { toValue: 1, duration: 380, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          ]),
        ]),
        Animated.delay(HOLD_MS),
        Animated.timing(out, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start(finish);
    }).catch(finish);
    return () => clearTimeout(t);
  }, [draw, drop, name, rest, out, onDone]);

  const rise = (v: Animated.Value, px: number) => ({ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [px, 0] }) }] });

  return (
    <Animated.View style={[fill, { zIndex: 95, backgroundColor: C.hero, opacity: out, direction: ar ? 'rtl' : 'ltr' }]}>
      <StatusBar style="light" />
      <Pressable accessibilityRole="button" accessibilityLabel={L.aSkip} onPress={onDone} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <LogoMark width={92} bowl={C.onHero} dot={C.onHeroAccent} draw={draw} drop={drop} />
        <Animated.View style={[{ alignItems: 'center', marginTop: 26 }, rise(name, 12)]}>
          <T f="display" w={700} s={ar ? 58 : 54} ls={ar ? 0 : -2.3} c={C.onHero} accessibilityRole="header">{L.appName}</T>
        </Animated.View>
        <Animated.View style={[{ alignItems: 'center', marginTop: 14, gap: 10 }, rise(rest, 8)]}>
          <T w={600} s={16} lh={1.4} c={C.onHero2} style={{ textAlign: 'center' }}>{L.splashTag}</T>
          <T w={700} s={12} ls={ar ? 0 : 0.6} c={C.onHeroAccent} style={{ textAlign: 'center' }}>{L.splashParts.join('  ·  ')}</T>
        </Animated.View>
      </Pressable>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 44, alignItems: 'center', opacity: rest }}>
        <T w={600} s={11} ls={ar ? 0 : 0.4} c={C.onHero3}>{L.madeIn}</T>
      </Animated.View>
    </Animated.View>
  );
}

// App Store Guideline 5.1.1(v): in-app account deletion with confirmation.
export function DeleteDialog() {
  const { C, L, ar, setDel, confirmDel, account } = useNazzim();
  return (
    <View style={[fill, { zIndex: 75, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: C.scrimDialog, direction: ar ? 'rtl' : 'ltr' }]}>
      <FadeIn duration={220} style={{ width: '100%', backgroundColor: C.card, borderRadius: 22, padding: 22 }}>
        <View accessibilityViewIsModal accessibilityRole="alert">
          <T f="display" w={700} s={18} ls={-0.4}>{account ? L.delTitle : L.delLocalTitle}</T>
          <T w={400} s={13} lh={1.5} c={C.ink2} style={{ marginTop: 8 }}>{account ? L.delBody : L.delLocalBody}</T>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
            <Btn onPress={() => setDel(false)} style={{ flex: 1, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: C.line, alignItems: 'center' }}>
              <T w={700} s={13.5}>{L.cancel}</T>
            </Btn>
            <Btn onPress={confirmDel} style={{ flex: 1, padding: 13, borderRadius: 13, backgroundColor: C.danger, alignItems: 'center' }}>
              <T w={700} s={13.5} c={C.onAccent}>{L.delConfirm}</T>
            </Btn>
          </View>
        </View>
      </FadeIn>
    </View>
  );
}

// nzToast: drop in, hold, fade out over 1.9s.
export function Toast() {
  const { C, toast } = useNazzim();
  const { headerTop } = useChrome();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!toast) return;
    AccessibilityInfo.announceForAccessibility(toast.msg);
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 1900, easing: Easing.linear, useNativeDriver: true }).start();
  }, [toast, v]);
  if (!toast) return null;
  const opacity = v.interpolate({ inputRange: [0, 0.12, 0.85, 1], outputRange: [0, 1, 1, 0] });
  const translateY = v.interpolate({ inputRange: [0, 0.12, 0.85, 1], outputRange: [-14, 0, 0, -6] });
  const scale = v.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0.96, 1, 1] });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: headerTop + 2, left: 0, right: 0, zIndex: 90, alignItems: 'center' }}>
      <Animated.View
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 99,
          backgroundColor: C.hero, boxShadow: C.shadowFloat, opacity, transform: [{ translateY }, { scale }],
        }}
      >
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.onHeroAccent, boxShadow: `0 0 8px ${C.onHeroAccent}` }} />
        <T w={700} s={12.5} c={C.onHero} numberOfLines={1}>{toast.msg}</T>
      </Animated.View>
    </View>
  );
}

export function clockText(secs: number) {
  return String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
}

// Floating mini-timer shown above the tab bar while a session runs on another tab.
export function MiniTimer({ onPress }: { onPress: () => void }) {
  const { C, timer, L, ar } = useNazzim();
  const { tabH } = useChrome();
  return (
    <FadeIn duration={250} style={{ position: 'absolute', left: 14, right: 14, bottom: tabH + 13, zIndex: 41 }}>
      <Btn
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.hero, boxShadow: C.shadowFloat, direction: ar ? 'rtl' : 'ltr' }}
      >
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.onHeroAccent, boxShadow: `0 0 8px ${C.onHeroAccent}` }} />
        <T w={600} s={12.5} c={C.onHero} numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>{timer.task || L.freeFocus}</T>
        <T f="grotesk" w={700} s={14} c={C.onHero} style={{ fontVariant: ['tabular-nums'] }}>{clockText(timer.secs)}</T>
      </Btn>
    </FadeIn>
  );
}
