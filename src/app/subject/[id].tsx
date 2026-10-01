import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Bar, SubjectTile } from '../../components/Academic';
import { Page, Row, Section } from '../../components/Page';
import { Btn, Eyebrow, Icon, T } from '../../components/ui';
import { recommendNextAction, summarizeSubject } from '../../engine/academic';
import { reasonText, useAcademic } from '../../lib/academic';
import { fmtDate, relDay } from '../../lib/format';
import { useNazzim } from '../../lib/store';
import { swatch } from '../../lib/theme';

// One subject: progress toward the target, its next study task, then tasks, exams and study sessions.
export default function SubjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { C, L, ar, accent, scheme, subjects, today, toggleTask, deleteSubject, startFocusOn } = useNazzim();
  const { ctx, chapterTitle } = useAcademic();
  const [confirm, setConfirm] = useState(false);
  const subject = subjects.find(s => s.id === id);
  if (!subject) return <Page title={L.subjects}><T c={C.ink3}>{L.noSubjects}</T></Page>;

  const sum = summarizeSubject(ctx, subject);
  const sw = swatch(subject.color, scheme);
  // Next move restricted to this subject.
  const examIds = new Set(ctx.exams.filter(e => e.subjectId === subject.id).map(e => e.id));
  const next = recommendNextAction({ ...ctx, tasks: ctx.tasks.filter(t => t.subjectId === subject.id), sessions: ctx.sessions.filter(s => examIds.has(s.examId)), exams: ctx.exams.filter(e => examIds.has(e.id)) }, chapterTitle);
  const tasks = ctx.tasks.filter(t => t.subjectId === subject.id).sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));

  return (
    <Page title={subject.name} sub={L.target.replace('{g}', subject.targetGrade)}>
      <View style={{ backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SubjectTile subject={subject} size={40} />
          <T w={700} s="label" style={{ flex: 1 }}>{L.progressL}</T>
          <T f="grotesk" w={700} s="title" c={sw.fg}>{`${sum.progress}%`}</T>
        </View>
        <Bar value={sum.progress} color={sw.fg} />
      </View>

      {(next.kind === 'session' || next.kind === 'task') && (
        <View style={{ gap: 8 }}>
          <View style={{ paddingHorizontal: 4 }}><Eyebrow>{L.nextTask}</Eyebrow></View>
          <Btn pressScale={0.99} onPress={() => startFocusOn(`${next.title} · ${subject.name}`, { kind: next.kind, id: next.id }, next.minutes)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: accent.a1 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T w={700} s="body">{next.title}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <Icon name="clock" size={14} color={C.ink3} />
                <T w={600} s="caption" c={C.ink3}>{`${next.minutes} ${L.min} · ${reasonText(next.reason, L)}`}</T>
              </View>
            </View>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: accent.a1, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="play" size={13} color={C.onAccent} />
            </View>
          </Btn>
        </View>
      )}

      <Section label={L.tasksL.toUpperCase()}>
        {tasks.map((t, i) => (
          <Row key={t.id} title={t.title} sub={`${fmtDate(t.due, L)} · ${t.estimateMin} ${L.min}`} last={i === tasks.length - 1}
            style={t.done ? { opacity: 0.55 } : undefined}
            right={
              <Btn label={L.markDoneA} accessibilityRole="checkbox" accessibilityState={{ checked: t.done }} onPress={() => toggleTask(t.id)} pressScale={0.9}
                style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: t.done ? 0 : 2, borderColor: t.due < today ? C.warningText : C.control, backgroundColor: t.done ? C.success : 'transparent' }}>
                {t.done && <Icon name="check" size={13} color={C.onSuccess} stroke={3.4} />}
              </Btn>
            } />
        ))}
        <Row icon="plus" title={L.addTask} onPress={() => router.push({ pathname: '/task/new', params: { subject: subject.id } })} last chevron={false}
          style={tasks.length ? { borderTopWidth: 1, borderTopColor: C.line2 } : undefined} />
      </Section>

      <Section label={L.examsL.toUpperCase()}>
        {sum.upcomingExams.map(e => (
          <Row key={e.id} icon="exam" title={`${e.subject}`} sub={`${fmtDate(e.date, L)} · ${relDay(e.date, today, L, ar)}`} onPress={() => router.push(`/exam/${e.id}`)} />
        ))}
        <Row icon="plus" title={L.exAdd} onPress={() => router.push({ pathname: '/exam/new', params: { subject: subject.id } })} last chevron={false} />
      </Section>

      <Section>
        <Row icon="target" title={L.studyL} sub={L.sessionsMonth.replace('{n}', String(sum.sessionsThisMonth))} last />
      </Section>

      <Btn onPress={() => { if (confirm) { deleteSubject(subject.id); router.back(); } else setConfirm(true); }}
        style={{ marginTop: 6, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: confirm ? C.danger : C.line, alignItems: 'center', backgroundColor: C.card }}>
        <T w={700} s="label" c={C.danger}>{confirm ? L.exDeleteConfirm : L.deleteSubject}</T>
      </Btn>
    </Page>
  );
}
