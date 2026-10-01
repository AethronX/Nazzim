import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, View } from 'react-native';
import { useNazzim } from '../lib/store';

// Bottom sheet over a dimmed scrim (nzUp: slides from 100% with an ease-out-expo curve).
export function Sheet({ onClose, children, maxHeight, z, px = 18, pb = 34 }: {
  onClose: () => void; children: ReactNode; maxHeight: `${number}%`; z: number; px?: number; pb?: number;
}) {
  const { C, L, ar } = useNazzim();
  const [y] = useState(() => new Animated.Value(1));
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (reduce) y.setValue(0);
      else Animated.timing(y, { toValue: 0, duration: 320, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
    }).catch(() => y.setValue(0));
  }, [y]);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: z, justifyContent: 'flex-end', direction: ar ? 'rtl' : 'ltr' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={L.aClose} onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.scrim }} />
      <Animated.View
        accessibilityViewIsModal
        style={{
          maxHeight, backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
          transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, 900] }) }],
        }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 18, paddingHorizontal: px, paddingBottom: pb, gap: 14 }}
        >
          <View style={{ width: 40, height: 4.5, borderRadius: 99, backgroundColor: C.line, alignSelf: 'center' }} />
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
