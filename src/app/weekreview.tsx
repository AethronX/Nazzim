import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Page, Section } from '../components/Page';
import { Button, Card, EmptyState, Notice, T } from '../components/ui';
import { subjectCards, weekPulse } from '../engine/dashboard';
import { weekReview } from '../engine/weekreview';
import { hours, useAcademic } from '../lib/academic';
import { DEFAULT_A, useNazzim } from '../lib/store';

// WEEKLY REVIEW: the facts of the week, then a proposed split for the next one. The split is a proposal —
// the spec requires that re-planning is visible and accepted, never applied behind the student's back.
export default function WeekReview() {
  const { C, L, ar, today, subjects, assessments, topics, errors, gradeTargets, focusLog, dayLogs, dailyMinutes, set, award } = useNazzim();
  const { ctx } = useAcademic();
  const W = L.wr;
  const [applied, setApplied] = useState(false);

  const cards = useMemo(
    () => subjectCards({ subjects, assessments, topics, errors, gradeTargets, defaultTarget: DEFAULT_A, today }),
    [subjects, assessments, topics, errors, gradeTargets, today],
  );
  const pulse = useMemo(() => weekPulse({ ctx, topics, errors, focusLog, dayLogs, today }), [ctx, topics, errors, focusLog, dayLogs, today]);
  const review = useMemo(() => weekReview({ pulse, cards, weeklyMinutes: dailyMinutes * 7 }), [pulse, cards, dailyMinutes]);

  const nothingYet = pulse.tasksDone === 0 && pulse.tasksOpen === 0 && pulse.focusMinutes === 0;
  if (nothingYet) {
    return <Page title={W.title} sub={W.sub}><EmptyState icon="chart" title={W.emptyT} body={W.emptyS} /></Page>;
  }

  const stat = (label: string, value: string, color = C.ink) => (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <T num="data" w={800} s="title" ls={-0.5} c={color}>{value}</T>
      <T w={600} s="micro" c={C.ink3} numberOfLines={1} style={{ textAlign: 'center' }}>{label}</T>
    </View>
  );

  return (
    <Page title={W.title} sub={W.sub}>
      <Card tone="hero" pad={18} style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {stat(W.completion, `${Math.round(review.completion * 100)}%`)}
          {stat(L.db.done, String(pulse.tasksDone), C.successText)}
          {stat(L.db.overdue, String(pulse.tasksOverdue), pulse.tasksOverdue ? C.warningText : C.ink)}
          {stat(W.focusT, hours(pulse.focusMinutes, ar))}
        </View>
      </Card>

      {review.highlights.map(h => (
        <Notice key={h.kind} tone={h.kind === 'strongWeek' ? 'success' : h.kind === 'lowLogging' ? 'info' : 'caution'}
          body={W.highlights[h.kind].replace('{n}', String(h.value))} />
      ))}

      {review.split.length > 0 && (
        <Section label={W.split}>
          {review.split.map((s, i) => (
            <View key={s.subjectId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: i === review.split.length - 1 ? 0 : 1, borderBottomColor: C.line2 }}>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <T w={700} s="label" numberOfLines={1}>{s.subjectName}</T>
                <T w={600} s="caption" c={C.ink3}>{W.why[s.why]}</T>
              </View>
              <T num="data" w={800} s="heading" c={C.ink}>{hours(s.minutes, ar)}</T>
            </View>
          ))}
        </Section>
      )}

      {review.split.length > 0 && (
        <>
          <Button title={applied ? W.applied : W.apply} icon="check" disabled={applied}
            onPress={() => {
              // Accepting only sets the weekly study target; it never rewrites the student's own plan.
              const total = review.split.reduce((t, s) => t + s.minutes, 0);
              set({ dailyMinutes: Math.max(30, Math.round(total / 7 / 5) * 5) });
              setApplied(true);
              award(0, W.applied);
            }} />
          <T w={500} s="caption" lh={1.5} c={C.ink3} style={{ paddingHorizontal: 4 }}>{W.note}</T>
        </>
      )}
    </Page>
  );
}
