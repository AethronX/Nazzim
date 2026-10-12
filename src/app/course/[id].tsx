import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { SubjectTile } from '../../components/Academic';
import { Page, Section } from '../../components/Page';
import { Btn, Button, Card, Icon, T } from '../../components/ui';
import { computeGrade } from '../../engine/grades';
import { topicStats } from '../../engine/topics';
import { summarize } from '../../engine/errors';
import { relDay } from '../../lib/format';
import { DEFAULT_A, useNazzim } from '../../lib/store';

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// COURSE: everything about one subject on one screen — when it meets, where its marks stand, what is due,
// how to study it, and what its final actually asks for. Built to be followed, not configured.
export default function Course() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { C, L, ar, today, subjects, assessments, topics, errors, classes, playbooks, gradeTargets } = useNazzim();
  const O = L.co;
  const subject = subjects.find(s => s.id === id);

  const mine = useMemo(() => assessments.filter(a => a.subjectId === id), [assessments, id]);
  const target = gradeTargets[id!] ?? DEFAULT_A;
  const grade = useMemo(() => computeGrade(mine, target), [mine, target]);
  const ts = useMemo(() => topicStats(topics, today, id), [topics, today, id]);
  const errs = useMemo(() => summarize(errors, today, id), [errors, today, id]);
  const slots = useMemo(() => classes.filter(c => c.subjectId === id).sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin), [classes, id]);
  const next = useMemo(() => mine.filter(a => a.status !== 'graded' && !!a.due && a.due >= today).sort((a, b) => a.due!.localeCompare(b.due!))[0], [mine, today]);
  const book = playbooks[id!];
  const todayWeekday = new Date().getDay();

  if (!subject) return <Page title={O.title}><T c={C.ink3}>{L.exNone}</T></Page>;

  const stat = (label: string, value: string, color = C.ink) => (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <T num="data" w={800} s="title" ls={-0.5} c={color}>{value}</T>
      <T w={600} s="micro" c={C.ink3} numberOfLines={1} style={{ textAlign: 'center' }}>{label}</T>
    </View>
  );

  const jump = (label: string, icon: 'chart' | 'target' | 'alert', to: string, badge?: number) => (
    <Btn onPress={() => router.push(to)} pressScale={0.98} label={label}
      style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
      <Icon name={icon} size={18} color={C.ink2} stroke={2.2} />
      <T w={700} s="caption" c={C.ink} numberOfLines={1}>{label}</T>
      {badge !== undefined && badge > 0 && <T num="data" w={700} s="micro" c={C.warningText}>{badge}</T>}
    </Btn>
  );

  return (
    <Page title={subject.name} sub={O.title}>
      <Card tone="hero" pad={18} style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SubjectTile subject={subject} size={40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T w={700} s="label" numberOfLines={1}>{next ? next.name : O.nextUp}</T>
            <T w={600} s="caption" c={C.ink3}>
              {next?.due ? `${O.nextUp} · ${relDay(next.due, today, L, ar)}` : L.db.noNext}
            </T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 12 }}>
          {stat(O.gradeNow, `${grade.earned}`)}
          {stat(O.needsFor, grade.required !== null && grade.required > 0 ? `${grade.required}%` : grade.verdict === 'needData' ? '—' : '✓',
            grade.verdict === 'impossible' ? C.danger : grade.verdict === 'needsPush' ? C.warningText : C.ink)}
          {stat(L.db.mastery, ts.total ? `${Math.round(ts.mastery * 100)}%` : '—')}
          {stat(L.tp.dueN, String(ts.due), ts.due ? C.warningText : C.ink)}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {jump(O.openGrades, 'chart', `/grades/${id}`)}
        {jump(O.openTopics, 'target', `/topics/${id}`, ts.due)}
        {jump(O.openErrors, 'alert', '/errors', errs.due)}
      </View>

      {/* Weekly classes */}
      <Section label={O.schedule}>
        {slots.length ? slots.map((c, i) => {
          const isToday = c.weekday === todayWeekday;
          return (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: i === slots.length - 1 ? 0 : 1, borderBottomColor: C.line2, backgroundColor: isToday ? C.card2 : undefined }}>
              <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99, backgroundColor: c.kind === 'lab' ? C.warningTint : C.line2 }}>
                <T w={700} s="micro" c={c.kind === 'lab' ? C.warningText : C.ink2}>{O.kinds[c.kind]}</T>
              </View>
              <T w={700} s="label" style={{ flex: 1 }}>{O.days[c.weekday]}</T>
              {isToday && <T w={700} s="micro" c={C.successText}>{O.todayClass}</T>}
              <T num="data" w={700} s="label" c={C.ink2}>{`${hhmm(c.startMin)}–${hhmm(c.endMin)}`}</T>
            </View>
          );
        }) : <View style={{ padding: 16 }}><T s="label" c={C.ink3}>{O.noClasses}</T></View>}
      </Section>

      {/* How to study this subject */}
      {!!book?.methods?.length && (
        <Section label={O.methodsT}>
          <View style={{ padding: 14, gap: 10 }}>
            {book.methods.map((m, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 7, backgroundColor: C.ink3 }} />
                <T w={500} s="label" lh={1.55} style={{ flex: 1 }}>{m}</T>
              </View>
            ))}
            <T w={500} s="caption" lh={1.5} c={C.ink3}>{O.methodsNote}</T>
          </View>
        </Section>
      )}

      {/* What the final actually asks for */}
      {!!book?.formats?.length && (
        <Section label={O.formats}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 14 }}>
            {book.formats.map(f => (
              <View key={f} style={{ paddingVertical: 5, paddingHorizontal: 11, borderRadius: 99, backgroundColor: C.card2 }}>
                <T w={700} s="caption" c={C.ink2}>{f}</T>
              </View>
            ))}
          </View>
        </Section>
      )}

      <Button variant="tertiary" title={L.tasksTitle} icon="check" onPress={() => router.push('/tasks')} />
    </Page>
  );
}
