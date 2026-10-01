import { useState } from 'react';
import { Animated, Platform, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// The Nazzim mark (ن): same geometry as assets/brand/nazzim-mark.svg, cropped to its bounds.
const VB = { x: 200, y: 180, w: 624, h: 664 };
const CX = 512, CY = 526, R = 250, SW = 112, GAP = 150, DOT_R = 72, DOT_Y = CY - R * 1.05;
const A1 = ((90 + GAP / 2) * Math.PI) / 180, A2 = ((90 - GAP / 2) * Math.PI) / 180;
const BOWL = `M ${CX + R * Math.cos(A1)} ${CY - R * Math.sin(A1)} A ${R} ${R} 0 1 0 ${CX + R * Math.cos(A2)} ${CY - R * Math.sin(A2)}`;
const BOWL_LEN = R * ((360 - GAP) * Math.PI) / 180;

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  width: number;
  bowl: string;
  dot: string;
  draw?: Animated.Value; // 0 → 1 draws the bowl like a pen stroke
  drop?: Animated.Value; // 0 → 1 drops the dot into place
};

export function LogoMark({ width, bowl, dot, draw, drop }: Props) {
  const [full] = useState(() => new Animated.Value(1));
  const d = draw ?? full, p = drop ?? full;
  const k = width / VB.w, height = VB.h * k;
  const r = DOT_R * k;
  return (
    <View style={{ width, height }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}>
        {/* react-native-svg's web shim forwards the animated wrapper's `collapsable` prop straight to the
            DOM, which React rejects with a console error on every splash. The stroke animation is a native
            nicety, so the web build draws the finished mark instead of animating it. */}
        {Platform.OS === 'web' ? (
          <Path d={BOWL} fill="none" stroke={bowl} strokeWidth={SW} strokeLinecap="round" />
        ) : (
          <AnimatedPath
            d={BOWL} fill="none" stroke={bowl} strokeWidth={SW} strokeLinecap="round"
            strokeDasharray={`${BOWL_LEN} ${BOWL_LEN}`}
            strokeDashoffset={d.interpolate({ inputRange: [0, 1], outputRange: [BOWL_LEN, 0] })}
            opacity={d.interpolate({ inputRange: [0, 0.02, 1], outputRange: [0, 1, 1] })}
          />
        )}
      </Svg>
      <Animated.View
        style={{
          position: 'absolute', width: r * 2, height: r * 2, borderRadius: r, backgroundColor: dot,
          left: (CX - VB.x) * k - r, top: (DOT_Y - VB.y) * k - r,
          opacity: p.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
          transform: [
            { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [-height * 0.45, 0] }) },
            { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          ],
        }}
      />
    </View>
  );
}
