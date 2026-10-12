import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { SubjectTile } from '../components/Academic';
import { Page, Section } from '../components/Page';
import { Btn, Card, EmptyState, T } from '../components/ui';
import { subjectCards, weekPulse, type SubjectCard } from '../engine/dashboard';
import { hours, useAcademic } from '../lib/academic';
import { DEFAULT_A, useNazzim } from '../lib/store';

// DASHBOARD: the control room. Every subject shows three different numbers side by side — the academic
// grade, how much content is covered, and how much is actually proved — because collapsing them into one
// percentage is the lie this product exists to avoid.
export default function Dashboard() {
  const { C, L, ar, today, subjects, assessments, topics, errors, gradeTargets, focusLog, dayLogs } = useNazzim();
  const { ctx } = useAcademic();
  const D = L.db;

  const cards = useMemo(
    () => subjectCards({ subjects, assessments, topics, errors, gradeTargets, defaultTarget: DEFAULT_A, today }),
    [subjects, assessments, topics, errors, gradeTargets, today],
  );
  const pulse = useMemo(
    () => weekPulse({ ctx, topics, errors, focusLog, dayLogs, today }),
    [ctx, topics, errors, focusLog, dayLogs, today],
  );

  if (!subjects.length) {
    return (
      <Page title={D.title} sub={D.sub}>
        <EmptyState icon="chart" title={D.emptyT} body={D.emptyS}
          action={{ label: L.addSubject, onPress: () => router.push('/subject/new') }} />
      </Page>
    );
  }

  const riskTone = (r: number) => (r >= 0.6 ? { bg: C.dangerTint, fg: C.danger } : r >= 0.35 ? { bg: C.warningTint, fg: C.warningText } : { bg: C.successTint, fg: C.successText });

  const metric = (label: string, value: string, color = C.ink) => (
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 2 }}>
      <T num="data" w={800} s="heading" c={color}>{value}</T>
      <T w={600} s="micro" c={C.ink3} numberOfLines={1} style={{ textAlign: 'center' }}>{label}</T>
    </View>
  );

  const card = (c: SubjectCard, last: boolean) => {
    const tone = riskTone(c.risk);
    const needs = c.grade.verdict === 'needData' ? D.dataGap
      : c.grade.required !== null && c.grade.required > 0 ? D.needs.replace('{n}', String(c.grade.required))
      : null;
    return (
      <View key={c.subject.id} style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line2, padding: 14, gap: 12 }}>
        <Btn pressScale={0.99} onPress={() => router.push(`/grades/${c.subject.id}`)} accessibilityLabel={c.subject.name}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SubjectTile subject={c.subject} size={38} />
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <T w={700} s="label" numberOfLines={1}>{c.subject.name}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              <T w={600} s="caption" c={C.ink3}>
                {c.daysToNext !== null ? D.nextIn.replace('{n}', String(c.daysToNext)) : D.noNext}
              </T>
              {!!needs && <T w={700} s="caption" c={tone.fg}>· {needs}</T>}
            </View>
          </View>
          <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 99, backgroundColor: tone.bg }}>
            <T num="data" w={800} s="micro" c={tone.fg}>{`${Math.round(c.risk * 100)}%`}</T>
          </View>
        </Btn>

        {/* Three different truths, never averaged together. */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {metric(D.grade, `${c.grade.earned}`, C.ink)}
          <View style={{ width: 1, backgroundColor: C.line2 }} />
          {metric(D.coverage, c.topics.total ? `${Math.round(c.topics.coverage * 100)}%` : '—')}
          <View style={{ width: 1, backgroundColor: C.line2 }} />
          {metric(D.mastery, c.topics.total ? `${Math.round(c.topics.mastery * 100)}%` : '—')}
          <View style={{ width: 1, backgroundColor: C.line2 }} />
          {metric(D.reviews, String(c.dueReviews), c.dueReviews ? C.warningText : C.ink)}
        </View>
      </View>
    );
  };

  return (
    <Page title={D.title} sub={D.sub}>
      {/* This week, in facts rather than encouragement. */}
      <Card tone="hero" pad={18} style={{ gap: 14 }}>
        <T w={800} s="micro" ls={ar ? 0 : 1} c={C.ink3}>{D.week}</T>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {metric(D.done, String(pulse.tasksDone), C.successText)}
          {metric(D.overdue, String(pulse.tasksOverdue), pulse.tasksOverdue ? C.warningText : C.ink)}
          {metric(D.focus, hours(pulse.focusMinutes, ar))}
          {metric(D.reviews, String(pulse.reviewsDue), pulse.reviewsDue ? C.warningText : C.ink)}
          {metric(D.mistakes, String(pulse.mistakesDue), pulse.mistakesDue ? C.danger : C.ink)}
        </View>
        {pulse.wellbeing.loggedDays > 0 && (
          <View style={{ flexDirection: 'row', gap: 6, borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 12 }}>
            {metric(L.wb.avgSleep, pulse.wellbeing.sleepAvg !== undefined ? `${pulse.wellbeing.sleepAvg.toFixed(1)}${L.wb.hours}` : '—')}
            {metric(L.wb.training, String(pulse.wellbeing.trainingDays))}
            {metric(L.wb.logged, `${pulse.wellbeing.loggedDays}/7`)}
          </View>
        )}
      </Card>

      <Section label={`${D.riskiest} · ${D.subjectsT}`}>
        {cards.map((c, i) => card(c, i === cards.length - 1))}
      </Section>

      <T w={500} s="caption" lh={1.55} c={C.ink3} style={{ paddingHorizontal: 4 }}>{D.fourNote}</T>
      <T w={500} s="caption" lh={1.55} c={C.ink3} style={{ paddingHorizontal: 4 }}>{D.riskNote}</T>
    </Page>
  );
}
