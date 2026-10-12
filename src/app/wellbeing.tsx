import { useMemo } from 'react';
import { View } from 'react-native';
import { Choice, Page, Section } from '../components/Page';
import { Btn, Card, Icon, Notice, T } from '../components/ui';
import { observeSleepVsFocus, weekSummary } from '../engine/wellbeing';
import { useNazzim } from '../lib/store';

// SLEEP & BODY: logging has to cost seconds, so everything is a tap. Nothing here is scored, nothing is a
// medical target, and a rest day is a complete day.
export default function Wellbeing() {
  const { C, L, ar, accent, today, dayLogs, logDay } = useNazzim();
  const W = L.wb;
  const d = dayLogs[today];
  const week = useMemo(() => weekSummary(dayLogs, today), [dayLogs, today]);
  const obs = useMemo(() => observeSleepVsFocus(dayLogs, today), [dayLogs, today]);

  // A stepper that can also clear itself back to "not logged".
  const stepper = (label: string, value: number | undefined, unit: string, step: number, set: (v: number | undefined) => void, max: number) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.line2 }}>
      <T w={700} s="label" style={{ flex: 1 }}>{label}</T>
      <Btn label={`${label} −`} pressScale={0.9} onPress={() => { const n = Math.max(0, (value ?? 0) - step); set(n === 0 ? undefined : Number(n.toFixed(1))); }}
        style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
        <T w={700} s="title" c={C.ink2} ltr style={{ marginTop: -2 }}>−</T>
      </Btn>
      <T num="data" w={800} s="heading" c={value === undefined ? C.ink3 : accent.fg} style={{ minWidth: 62, textAlign: 'center' }}>
        {value === undefined ? '—' : `${value}${unit}`}
      </T>
      <Btn label={`${label} +`} pressScale={0.9} onPress={() => set(Number(Math.min(max, (value ?? 0) + step).toFixed(1)))}
        style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={16} color={C.ink2} stroke={2.4} />
      </Btn>
    </View>
  );

  const level = (label: string, value: 1 | 2 | 3 | undefined, set: (v: 1 | 2 | 3) => void, last = false) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line2 }}>
      <T w={700} s="label" style={{ flex: 1 }}>{label}</T>
      <Choice options={[1, 2, 3] as const} value={value ?? 0 as 1} onChange={set} labels={W.levels3} />
    </View>
  );

  const stat = (label: string, value: string) => (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <T num="data" w={800} s="title" ls={-0.5}>{value}</T>
      <T w={600} s="micro" c={C.ink3} numberOfLines={1} style={{ textAlign: 'center' }}>{label}</T>
    </View>
  );

  return (
    <Page title={W.title} sub={W.sub}>
      {/* Rest day: one tap, and the day is complete. */}
      <Btn pressScale={0.99} onPress={() => logDay(today, { restDay: !d?.restDay })} accessibilityRole="switch"
        accessibilityState={{ checked: !!d?.restDay }} accessibilityLabel={W.rest}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, backgroundColor: d?.restDay ? C.successTint : C.card, borderWidth: 1, borderColor: d?.restDay ? C.success : C.line }}>
        <Icon name={d?.restDay ? 'check' : 'clock'} size={18} color={d?.restDay ? C.successText : C.ink2} stroke={2.4} />
        <T w={700} s="label" c={d?.restDay ? C.successText : C.ink} style={{ flex: 1 }}>{W.rest}</T>
      </Btn>

      <Section label={W.todayT}>
        {stepper(W.sleep, d?.sleepHours, W.hours, 0.5, v => logDay(today, { sleepHours: v }), 14)}
        {stepper(W.water, d?.water, W.litres, 0.5, v => logDay(today, { water: v }), 8)}
        {stepper(W.run, d?.runMinutes, W.mins, 5, v => logDay(today, { runMinutes: v }), 300)}
        {stepper(W.lift, d?.liftMinutes, W.mins, 5, v => logDay(today, { liftMinutes: v }), 300)}
        {level(W.sleepQ, d?.sleepQuality, v => logDay(today, { sleepQuality: v }))}
        {level(W.energy, d?.energy, v => logDay(today, { energy: v }))}
        {level(W.focusFelt, d?.focusFelt, v => logDay(today, { focusFelt: v }), true)}
      </Section>

      <Card tone="hero" pad={18} style={{ gap: 14 }}>
        <T w={800} s="micro" ls={ar ? 0 : 1} c={C.ink3}>{W.week}</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {stat(W.logged, `${week.loggedDays}/7`)}
          {stat(W.avgSleep, week.sleepAvg !== undefined ? `${week.sleepAvg.toFixed(1)}${W.hours}` : '—')}
          {stat(W.training, String(week.trainingDays))}
          {stat(W.restDays, String(week.restDays))}
        </View>
        {obs && (
          <Notice tone="info" body={W.obsSleep.replace('{a}', String(obs.betterAfter)).replace('{b}', String(obs.worseAfter))} />
        )}
        <T w={500} s="caption" lh={1.5} c={C.ink3}>{W.restNote}</T>
      </Card>

      <T w={500} s="caption" lh={1.5} c={C.ink3} style={{ paddingHorizontal: 4 }}>{W.disclaimer}</T>
    </Page>
  );
}
