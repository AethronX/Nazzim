import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ProgressRing, SubjectTile } from '../../components/Academic';
import { Page, Section } from '../../components/Page';
import { SessionRow } from '../../components/Study';
import { Btn, Icon, PrimaryBtn, T, type IconName } from '../../components/ui';
import { examReport, type TopicState } from '../../engine/exam';
import { recallStats } from '../../engine/recall';
import { hours, useAcademic } from '../../lib/academic';
import { fmtDate, relDay } from '../../lib/format';
import { useNazzim } from '../../lib/store';

// EXAM: readiness explained. Days left, where you stand vs the plan, each topic's state, what's left,
// and one primary action: the next session. The full day-by-day plan sits below.
export default function ExamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { C, L, ar, accent, exams, study, cards, today, deleteExam, startFocusOn } = useNazzim();
  const { chapterTitle, subjectById } = useAcademic();
  const [confirm, setConfirm] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const exam = exams.find(e => e.id === id);
  if (!exam) return <Page title={L.exams}><T c={C.ink3}>{L.exNone}</T></Page>;

  const r = examReport(exam, study, today);
  const dueN = recallStats(cards, exam.id, today).due;
  const subject = exam.subjectId ? subjectById.get(exam.subjectId) : undefined;
  const mine = study.filter(s => s.examId === exam.id);
  const dates = [...new Set(mine.filter(s => showDone || !s.done || s.date >= today).map(s => s.date))].sort();
  const doneCount = mine.filter(s => s.done).length;
  const chip = r.daysLeft < 0 ? L.xOver : r.daysLeft === 0 ? L.xToday : r.daysLeft === 1 ? L.xDayLeft : L.xDaysLeft.replace('{n}', String(r.daysLeft));
  const tone = {
    onTrack: { fg: C.successText, bg: C.successTint, icon: 'check' as IconName },
    ready: { fg: C.successText, bg: C.successTint, icon: 'check' as IconName },
    behind: { fg: C.warningText, bg: C.warningTint, icon: 'alert' as IconName },
    atRisk: { fg: C.warningText, bg: C.warningTint, icon: 'alert' as IconName },
    over: { fg: C.ink2, bg: C.line2, icon: 'check' as IconName },
  }[r.status];
  const nextTitle = r.next ? `${chapterTitle(r.next, exam)} · ${{ learn: L.kLearn, review: L.kReview, mock: L.kMock }[r.next.kind]}` : '';

  return (
    <Page title={exam.subject} sub={`${fmtDate(exam.date, L)} · ${relDay(exam.date, today, L)}`}>
      {/* Readiness: white card, Indigo only as the accent */}
      <View style={{ backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.line, padding: 18, gap: 14, boxShadow: C.shadowSoft }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {!!subject && <SubjectTile subject={subject} size={28} />}
              <View style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 99, backgroundColor: r.daysLeft <= 3 && r.daysLeft >= 0 ? C.warningTint : accent.tint }}>
                <T w={800} s={10.5} ls={ar ? 0 : 0.6} c={r.daysLeft <= 3 && r.daysLeft >= 0 ? C.warningText : accent.strong}>{chip}</T>
              </View>
            </View>
            <T w={600} s={12.5} c={C.ink3}>{L.xReadiness}</T>
            <T w={600} s={12} c={C.ink3}>{L.xPhase[r.phase]}</T>
            {/* The number is auditable: one tap shows the evidence it rests on. */}
            <Btn label={L.rdWhy} onPress={() => router.push(`/readiness/${exam.id}`)} pressScale={0.97}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 2 }}>
              <Icon name="help" size={13} color={accent.fg} stroke={2.2} />
              <T w={700} s={12} c={accent.fg}>{L.rdWhy}</T>
            </Btn>
          </View>
          <Btn label={L.rdWhy} onPress={() => router.push(`/readiness/${exam.id}`)} pressScale={0.96}>
            <ProgressRing value={r.readiness} size={88} stroke={8} />
          </Btn>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, backgroundColor: tone.bg, alignItems: 'flex-start' }}>
          <Icon name={tone.icon} size={16} color={tone.fg} stroke={2.4} />
          <View style={{ flex: 1, gap: 2 }}>
            <T w={700} s={13.5} c={tone.fg}>{L.xStatus[r.status]}</T>
            <T w={500} s={12.5} lh={1.45} c={tone.fg}>{L.xStatusSub[r.status].replace('{n}', String(r.overdue))}</T>
          </View>
        </View>
        {r.remaining.sessions > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T w={600} s={12.5} c={C.ink2}>{L.xRemaining.replace('{s}', String(r.remaining.sessions)).replace('{t}', hours(r.remaining.minutes, ar))}</T>
            {r.daysLeft > 0 && <T w={600} s={12.5} c={C.ink3}>{L.xPerDay.replace('{m}', hours(r.remaining.perDay, ar))}</T>}
          </View>
        )}
      </View>

      {/* One primary action */}
      {r.next && r.daysLeft >= 0 && (
        <PrimaryBtn title={L.xNextBtn.replace('{t}', nextTitle)} icon="play"
          onPress={() => startFocusOn(`${chapterTitle(r.next!, exam)} · ${exam.subject}`, { kind: 'session', id: r.next!.id }, r.next!.minutes)} />
      )}
      {!!r.weakest && r.weakest.state === 'weak' && (
        <T w={600} s={12.5} c={C.warningText} style={{ textAlign: 'center' }}>{L.xFocusOn.replace('{t}', r.weakest.title)}</T>
      )}
      {/* Self-test sits beside the study action, never behind it: recall is what the exam actually asks for. */}
      {r.daysLeft >= 0 && (
        <Btn onPress={() => router.push(`/recall/${exam.id}`)} pressScale={0.98}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
          <Icon name="sparkle" size={17} color={accent.fg} stroke={2.3} />
          <T w={700} s={14.5} c={accent.fg}>{dueN ? `${L.rcOpen} · ${L.rcDue.replace('{n}', String(dueN))}` : L.rcOpen}</T>
        </Btn>
      )}

      {/* Topics */}
      <Section label={L.xTopics}>
        {r.topics.map((t, i) => (
          <View key={t.index} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: i === r.topics.length - 1 ? 0 : 1, borderBottomColor: C.line2 }}>
            <TopicMark state={t.state} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T w={600} s={14} numberOfLines={1}>{t.title}</T>
              <T w={600} s={11.5} c={t.state === 'weak' ? C.warningText : C.ink3} style={{ marginTop: 1 }}>
                {`${L.xTopicState[t.state]}${t.nextDate && t.state !== 'solid' ? ' · ' + relDay(t.nextDate, today, L) : ''}`}
              </T>
            </View>
            <T f="grotesk" w={700} s={12} c={C.ink3}>{`${t.done}/${t.total}`}</T>
          </View>
        ))}
      </Section>

      {!!r.mock && !r.mock.done && <T w={500} s={12.5} lh={1.5} c={C.ink3} style={{ paddingHorizontal: 4 }}>{L.xMock.replace('{d}', relDay(r.mock.date, today, L))}</T>}

      {/* Plan, day by day (finished days folded away) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8 }}>
        <T w={800} s={10.5} ls={0.8} c={C.ink3}>{L.xPlan}</T>
        {doneCount > 0 && (
          <Btn onPress={() => setShowDone(v => !v)} style={{ paddingVertical: 4, paddingHorizontal: 8 }}>
            <T w={700} s={12} c={accent.fg}>{L.xDoneN.replace('{n}', String(doneCount))}</T>
          </Btn>
        )}
      </View>
      {dates.map(d => {
        const list = mine.filter(s => s.date === d && (showDone || !s.done || d >= today));
        return (
          <View key={d} style={{ gap: 6 }}>
            <T w={700} s={12} c={d === today ? accent.fg : d < today ? C.warningText : C.ink2} style={{ paddingHorizontal: 4 }}>{`${fmtDate(d, L)} · ${relDay(d, today, L)}`}</T>
            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: d === today ? accent.a1 : C.line, borderRadius: 18, overflow: 'hidden' }}>
              {list.map((s, i) => <SessionRow key={s.id} s={s} exam={exam} last={i === list.length - 1} showExam={false} />)}
            </View>
          </View>
        );
      })}

      <Btn onPress={() => router.push({ pathname: '/planner', params: { q: `${exam.subject} ${L.kExam} ${Math.max(1, r.daysLeft)} ${ar ? 'أيام' : 'days'}` } })}
        style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
        <Icon name="pencil" size={15} color={C.ink2} />
        <T w={700} s={14} c={C.ink2}>{L.xAdjust}</T>
      </Btn>
      <Btn onPress={() => { if (confirm) { deleteExam(exam.id); router.back(); } else setConfirm(true); }}
        style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: confirm ? C.danger : C.line, alignItems: 'center', backgroundColor: C.card }}>
        <T w={700} s={14} c={C.danger}>{confirm ? L.exDeleteConfirm : L.exDelete}</T>
      </Btn>
    </Page>
  );
}

// Topic state as a shape + colour (never colour alone): empty ring, half, full check, warning.
function TopicMark({ state }: { state: TopicState }) {
  const { C, accent } = useNazzim();
  if (state === 'solid') return <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={12} color={C.onSuccess} stroke={3.2} /></View>;
  if (state === 'weak') return <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.warningTint, alignItems: 'center', justifyContent: 'center' }}><Icon name="alert" size={13} color={C.warningText} stroke={2.4} /></View>;
  if (state === 'learning') return <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: accent.fg, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: accent.fg }} /></View>;
  return <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.control }} />;
}
