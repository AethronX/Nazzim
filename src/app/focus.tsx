import { Btn, Clock, Icon, PrimaryBtn, T } from '../components/ui';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { clockText } from '../components/Overlays';
import { router } from 'expo-router';
import { Page } from '../components/Page';
import { useNazzim } from '../lib/store';
import { useTimerSecs } from '../lib/timer';
import { ReminderAsk } from '../components/Habits';
import type { Palette } from '../lib/theme';

const R = 112;
const CIRC = 2 * Math.PI * R; // 703.7
const PRESETS = [25, 50, 90];

export default function Focus() {
  const {
    C, L, ar, accent, timer, preset, setPreset, toggleTimer, resetTimer, finishNow,
    review, clearReview, rateSession, toggleTask, tasks,
  } = useNazzim();
  const linked = !!timer.target;
  const secs = useTimerSecs();

  // Just finished a linked block: close the loop (rating → exam readiness, task → done) before anything else.
  if (review) {
    const close = () => { clearReview(); router.navigate('/'); };
    return (
      <Page title={L.focus}>
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 16 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: C.successTint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={34} color={C.successText} stroke={2.6} />
          </View>
          <T f="display" w={700} s={24} ls={ar ? 0 : -0.5}>{L.sessionComplete}</T>
          <T w={600} s={13.5} c={C.ink2} style={{ textAlign: 'center' }}>{review.title}</T>
          <T f="grotesk" w={700} s={13} c={accent.fg}>{L.focusMin.replace('{n}', String(review.minutes))}</T>
        </View>
        <View style={{ backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 16, gap: 14 }}>
          <T w={600} s={14} style={{ textAlign: 'center' }}>{review.target?.kind === 'task' ? L.taskDoneQ : L.howWent}</T>
          {review.target?.kind === 'session' ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([[1, L.rHard, C.dangerTint, C.danger], [2, L.rOk, accent.tint, accent.strong], [3, L.rEasy, C.successTint, C.successText]] as const).map(([c, label, bg, fg]) => (
                <Btn key={c} onPress={() => { rateSession(review.target!.id, c); close(); }}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: bg, alignItems: 'center' }}>
                  <T w={700} s={14} c={fg}>{label}</T>
                </Btn>
              ))}
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <PrimaryBtn title={L.yesDone} icon="check" onPress={() => { if (!tasks.find(t => t.id === review.target!.id)?.done) toggleTask(review.target!.id); close(); }} />
              <Btn onPress={close} style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.line, alignItems: 'center' }}>
                <T w={700} s={14} c={C.ink2}>{L.notYet}</T>
              </Btn>
            </View>
          )}
        </View>
        <ReminderAsk />
      </Page>
    );
  }
  const { total, running } = timer;
  const phase = running ? L.inFocus : secs < total ? L.paused : L.ready;

  return (
    <Page title={L.focus}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 3, borderColor: accent.a1 }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T w={800} s={10} ls={0.8} c={C.ink3}>{L.focusOn}</T>
            <T w={700} s={13.5} numberOfLines={1} style={{ marginTop: 2 }}>{timer.task || L.freeFocus}</T>
          </View>
        </View>

        <View style={{ alignItems: 'center', paddingVertical: 6 }}>
          <View style={{ width: 252, height: 252 }} accessibilityRole="timer" accessibilityLabel={`${clockText(secs)} ${phase}`}>
            <Svg width={252} height={252} viewBox="0 0 252 252" style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={126} cy={126} r={R} fill="none" stroke={accent.tint2} strokeWidth={10} />
              <Circle
                cx={126} cy={126} r={R} fill="none" stroke={accent.fg} strokeWidth={10} strokeLinecap="round"
                strokeDasharray={`${CIRC}`} strokeDashoffset={CIRC * (1 - secs / total)}
              />
            </Svg>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Clock secs={secs} size={56} />
              <T w={800} s={10.5} ls={1.6} c={accent.fg}>{phase}</T>
            </View>
          </View>
        </View>

        {!linked && <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {PRESETS.map(m => {
            const on = preset === m;
            return (
              <Btn
                key={m}
                accessibilityState={{ selected: on }}
                onPress={() => setPreset(m)}
                style={[{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: 99 }, on ? { backgroundColor: C.inv } : { backgroundColor: C.card, borderWidth: 1, borderColor: C.line }]}
              >
                <T w={700} s={12} c={on ? C.onInv : C.ink2}>{m + (ar ? ' د' : ' min')}</T>
              </Btn>
            );
          })}
        </View>}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <Btn label={L.aReset} onPress={resetTimer} style={roundBtn(C)}>
            <Icon name="reset" size={20} color={C.ink2} stroke={2.1} />
          </Btn>
          <Btn pressedBg={accent.strong}
            label={L.aPlay}
            onPress={toggleTimer}
            pressScale={0.96}
            style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: accent.a1, alignItems: 'center', justifyContent: 'center', boxShadow: accent.glow }}
          >
            <Icon name={running ? 'pause' : 'play'} size={running ? 26 : 28} color={C.onAccent} />
          </Btn>
          <Btn label={L.aFinish} onPress={finishNow} style={roundBtn(C)}>
            <Icon name="skip" size={20} color={C.ink2} stroke={2.1} />
          </Btn>
        </View>

    </Page>
  );
}

const roundBtn = (C: Palette) => ({ width: 50, height: 50, borderRadius: 25, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' } as const);
