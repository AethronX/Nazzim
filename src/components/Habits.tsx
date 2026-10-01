import { router } from 'expo-router';
import { View } from 'react-native';
import { activationChecklist, reminderTime, studyStreak, weeklyRecap, type ChecklistStep } from '../engine/habits';
import { hours, useAcademic } from '../lib/academic';
import { track } from '../services/analytics';
import { useNazzim } from '../lib/store';
import { Bar } from './Academic';
import { Btn, Card, Icon, T } from './ui';

const hhmm = (t: { hour: number; minute: number }) => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;

// Study days in a row. Shown from 1 day; a calm amber outline when today still needs a session.
export function StreakChip() {
  const { C, L, focusLog, accent } = useNazzim();
  const { ctx } = useAcademic();
  const s = studyStreak(ctx, focusLog);
  if (!s.days) return null;
  return (
    <Btn label={L.streakA.replace('{n}', String(s.days))} onPress={() => router.push('/progress')} pressScale={0.94}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.5,
        borderColor: s.atRisk ? C.warning : C.line, backgroundColor: C.card }}>
      <Icon name="flame" size={16} color={s.atRisk ? C.warningText : accent.fg} />
      <T f="grotesk" w={700} s="body">{String(s.days)}</T>
    </Btn>
  );
}

// "Getting started": endowed progress (step 1 is already done) and one tap per step.
export function ActivationChecklist() {
  const { C, L, accent, focusLog, reminders, account, checklistHidden, set, setReminders, startFocusOn } = useNazzim();
  const { ctx, chapterTitle } = useAcademic();
  const c = activationChecklist(ctx, focusLog, { reminders: reminders.on, account: !!account });
  if (c.complete || checklistHidden) return null;
  const act: Record<ChecklistStep, () => void> = {
    semester: () => router.push('/subjects'),
    focus: () => {
      const s = ctx.sessions.find(x => !x.done && x.date <= ctx.today), e = ctx.exams.find(x => x.id === s?.examId);
      if (s) startFocusOn(`${chapterTitle(s, e)} · ${e?.subject ?? ''}`, { kind: 'session', id: s.id }, s.minutes);
      else startFocusOn(L.freeFocus);
    },
    rate: () => router.push('/plan'),
    reminders: () => setReminders({ on: true }),
    account: () => router.push('/account'),
  };
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T f="display" w={700} s="body" style={{ flex: 1 }}>{L.clTitle}</T>
        <T w={700} s="caption" c={accent.fg}>{L.clProgress.replace('{d}', String(c.done)).replace('{t}', String(c.total))}</T>
        <Btn onPress={() => set({ checklistHidden: true })} style={{ paddingVertical: 4, paddingHorizontal: 8 }}>
          <T w={700} s="caption" c={C.ink3}>{L.clHide}</T>
        </Btn>
      </View>
      <Bar value={(c.done / c.total) * 100} height={5} />
      <View style={{ gap: 2 }}>
        {c.steps.map(st => (
          <Btn key={st.id} disabled={st.done} onPress={act[st.id]} pressScale={0.99} accessibilityState={{ checked: st.done }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: st.done ? 0 : 2, borderColor: C.control, backgroundColor: st.done ? C.success : 'transparent' }}>
              {st.done && <Icon name="check" size={12} color={C.onSuccess} stroke={3.2} />}
            </View>
            <T w={600} s="label" c={st.done ? C.ink3 : C.ink} style={[{ flex: 1 }, st.done && { textDecorationLine: 'line-through' }]}>{L.clSteps[st.id]}</T>
            {!st.done && <Icon name="chevron" size={13} color={C.ink3} stroke={2.3} />}
          </Btn>
        ))}
      </View>
    </Card>
  );
}

// Fresh start: on the first days of a week, last week in numbers and a look at this one.
export function WeeklyRecapCard() {
  const { C, L, ar, accent, focusLog, recapSeen, set } = useNazzim();
  const { ctx } = useAcademic();
  const r = weeklyRecap(ctx, focusLog);
  if (!r || recapSeen === r.weekKey) return null;
  return (
    <Card style={{ gap: 8, backgroundColor: accent.tint, borderColor: accent.tint }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="chart" size={16} color={accent.strong} />
        <T f="display" w={700} s="body" c={accent.strong} style={{ flex: 1 }}>{L.recapTitle}</T>
        <Btn label={L.aClose} onPress={() => set({ recapSeen: r.weekKey })} style={{ padding: 4 }}>
          <T w={700} s="body" c={accent.strong}>✕</T>
        </Btn>
      </View>
      <T w={600} s="label" lh={1.45} c={C.ink}>
        {L.recapBody.replace('{m}', hours(r.minutes, ar)).replace('{d}', String(r.activeDays)).replace('{s}', String(r.sessions + r.tasks))}
      </T>
      {r.nextWeekMin > 0 && <T w={500} s="label" c={C.ink2}>{L.recapNext.replace('{m}', hours(r.nextWeekMin, ar))}</T>}
      <Btn onPress={() => { set({ recapSeen: r.weekKey }); track({ name: 'weekly_recap_opened' }); router.push('/plan'); }} style={{ alignSelf: 'flex-start', marginTop: 4, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: accent.a1 }}>
        <T w={700} s="label" c={C.onAccent}>{L.recapCta}</T>
      </Btn>
    </Card>
  );
}

// Asked right after a win (a finished session), never at launch: the moment people say yes.
export function ReminderAsk() {
  const { C, L, accent, reminders, studyTime, setReminders } = useNazzim();
  if (reminders.on) return null;
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: accent.tint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={17} color={accent.strong} />
        </View>
        <T w={700} s="label" style={{ flex: 1 }}>{L.remAskT}</T>
      </View>
      <T w={500} s="label" lh={1.45} c={C.ink2}>{L.remAskB.replace('{t}', hhmm(reminderTime(studyTime)))}</T>
      <Btn onPress={() => setReminders({ on: true })} pressedBg={accent.strong} style={{ padding: 13, borderRadius: 12, backgroundColor: accent.a1, alignItems: 'center' }}>
        <T w={700} s="label" c={C.onAccent}>{L.remAskYes}</T>
      </Btn>
    </Card>
  );
}

export { hhmm };
