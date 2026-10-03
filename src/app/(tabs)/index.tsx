import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { ProgressRing, SubjectTile } from '../../components/Academic';
import { Timeline } from '../../components/Agenda';
import { ActivationChecklist, StreakChip, WeeklyRecapCard } from '../../components/Habits';
import { Avatar } from '../../components/Page';
import { Btn, Button, Card, EmptyState, Icon, SectionHeader, T } from '../../components/ui';
import { agendaFor } from '../../engine/academic';
import { assessBehind } from '../../engine/rescue';
import { hours, useAcademic } from '../../lib/academic';
import { daysBetween } from '../../lib/exams';
import { fmtDateLine, relDay } from '../../lib/format';
import { useChrome } from '../../lib/layout';
import { evidenceDetail, nextEvidence } from '../../lib/readiness';
import { useNazzim } from '../../lib/store';

// TODAY answers one question: "What should I do right now?"
//
// It used to answer a different one — "what is the next thing on my calendar?" — by calling
// `recommendNextAction`, which ranks by exam proximity and overdue-ness and knows nothing about evidence.
// Executed against a student who had ticked every block with zero focused minutes, four days from an exam at
// 32% evidence, it returned `{kind:'clear'}`: *you're done for today*. That is a to-do list's answer.
//
// The hero now reads straight from the evidence model: the nearest exam, how complete its evidence is, the
// single highest-value gap across every upcoming exam, and one button that goes and closes it.
export default function Today() {
  const { C, L, ar, accent, me, today, cards, startFocusOn, setQuick } = useNazzim();
  const { headerTop, scrollBottom } = useChrome();
  const { ctx, chapterTitle, subjectById, studyStart } = useAcademic();

  const agenda = agendaFor(ctx, today, { exam: L.kExam, task: L.kTaskB, kind: k => ({ learn: L.kLearn, review: L.kReview, mock: L.kMock })[k] }, chapterTitle, studyStart);
  const blocks = agenda.filter(a => a.kind !== 'exam');
  const doneN = blocks.filter(b => b.done).length;
  const leftMin = blocks.filter(b => !b.done).reduce((a, b) => a + b.minutes, 0);
  const hour = new Date().getHours();
  const greet = L.greetings[hour < 12 ? 0 : hour < 18 ? 1 : 2];

  // The exam the student is closest to sitting, and the one gap worth their next hour.
  const nextExam = ctx.exams.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const detail = nextExam ? evidenceDetail(nextExam, ctx.sessions, cards, today) : null;
  const target = nextEvidence(ctx.exams, ctx.sessions, cards, today);
  const subject = nextExam?.subjectId ? subjectById.get(nextExam.subjectId) : undefined;
  const daysLeft = nextExam ? daysBetween(today, nextExam.date) : NaN;

  // The block the suggested action belongs to, so the button can start it rather than just point at it.
  const targetSession = target && target.chapter >= -1
    ? ctx.sessions.find(s => s.examId === target.examId && s.chapter === target.chapter && !s.done && !s.orphan)
    : undefined;
  const targetExam = target ? ctx.exams.find(e => e.id === target.examId) : undefined;
  const targetChapter = target && targetExam
    ? (target.chapter < 0 ? L.exAll : targetExam.chapters[target.chapter] ?? '')
    : '';
  const headline = !target ? L.evReady
    : target.kind === 'study' ? L.evStudy.replace('{c}', targetChapter)
    : target.kind === 'focus' ? L.evFocus.replace('{c}', targetChapter)
    : target.kind === 'recall' ? L.evRecall.replace('{c}', targetChapter)
    : target.kind === 'mock' ? L.evMock
    : L.evReady;

  const act = () => {
    if (!target || !targetExam) return;
    if (target.kind === 'recall') { router.push(`/recall/${target.examId}`); return; }
    if (targetSession) {
      startFocusOn(`${targetChapter}${subject ? ' · ' + targetExam.subject : ''}`, { kind: 'session', id: targetSession.id }, targetSession.minutes);
      return;
    }
    router.push(`/exam/${target.examId}`);
  };

  // Triage is offered on today's real pressure, measured against the student's own capacity — and now also
  // against the evidence gap on the nearest exam. One forgotten ten-minute task no longer qualifies.
  const behind = assessBehind(ctx, 7, detail?.score);

  return (
    <View style={{ flex: 1, direction: ar ? 'rtl' : 'ltr' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: headerTop, paddingHorizontal: 18, paddingBottom: scrollBottom, gap: 14 }}>
        {/* Greeting */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T w={700} s="caption" ls={ar ? 0 : 0.6} c={C.ink3}>{fmtDateLine(today, L, ar)}</T>
            {me.name ? (
              <>
                <T w={600} s="label" c={C.ink3} numberOfLines={1} style={{ marginTop: 3 }}>{greet}</T>
                <T f="display" w={700} s="title" ls={ar ? 0 : -0.8} accessibilityRole="header" numberOfLines={1} style={{ marginTop: -1 }}>
                  {me.name.split(/\s+/)[0]}
                </T>
              </>
            ) : (
              <T f="display" w={700} s="title" ls={ar ? 0 : -0.8} style={{ marginTop: 2 }} accessibilityRole="header" numberOfLines={1}>{greet}</T>
            )}
            {!!blocks.length && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {blocks.slice(0, 8).map(b => <View key={b.key} style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: b.done ? accent.fg : C.line }} />)}
                </View>
                <T w={600} s="caption" c={C.ink3} style={{ flexShrink: 1 }} numberOfLines={1}>
                  {doneN === blocks.length ? L.dayDone : L.dayProgress.replace('{d}', String(doneN)).replace('{t}', String(blocks.length)).replace('{m}', hours(leftMin, ar))}
                </T>
              </View>
            )}
          </View>
          <StreakChip />
          <Btn label={L.qaTitle} onPress={() => setQuick(true)} pressScale={0.94}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: accent.tint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={18} color={accent.strong} stroke={2.6} />
          </Btn>
          <Btn label={L.profile} onPress={() => router.push('/profile')} pressScale={0.94}>
            <Avatar name={me.name} size={44} />
          </Btn>
        </View>

        {/* THE HERO: exam → evidence → next evidence → one action */}
        {nextExam && detail ? (
          <Card tone="hero" pad={18} style={{ gap: 16 }}>
            {/* 1. which exam, and when */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <SubjectTile subject={subject} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T f="display" w={700} s="heading" numberOfLines={1}>{nextExam.subject}</T>
                <T w={600} s="caption" c={Number.isFinite(daysLeft) && daysLeft <= 3 ? C.warningText : C.ink3} style={{ marginTop: 1 }}>
                  {L.glanceExam} · {relDay(nextExam.date, today, L, ar)}
                </T>
              </View>
            </View>

            {/* 2. evidence completeness — named honestly, and tappable to its own explanation */}
            <Btn pressScale={0.99} onPress={() => router.push(`/readiness/${nextExam.id}`)}
              accessibilityLabel={`${L.glanceSemester} ${detail.score}% · ${L.evWhy}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <ProgressRing value={detail.score} size={52} stroke={5} label="" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T w={600} s="caption" c={C.ink3}>{L.glanceSemester}</T>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <T num="data" f="display" w={800} s="display" c={accent.fg}>{`${detail.score}%`}</T>
                  <T w={600} s="caption" c={accent.fg} style={{ textDecorationLine: 'underline' }}>{L.evWhy}</T>
                </View>
                {/* Context, not a prediction: what this much evidence means and what moves it. */}
                <T w={500} s="caption" lh={1.5} c={C.ink2}>{L.evBand[detail.score < 35 ? 0 : detail.score < 70 ? 1 : 2]}</T>
              </View>
            </Btn>

            {/* 3. the single next piece of evidence */}
            <View style={{ height: 1, backgroundColor: C.line }} />
            <View style={{ gap: 6 }}>
              <T w={800} s="micro" ls={ar ? 0 : 1.2} c={C.ink3}>{L.evNext}</T>
              <T f="display" w={700} s="heading" lh={1.3} ls={ar ? 0 : -0.3}>{headline}</T>
              {!target && <T w={500} s="caption" c={C.ink2} lh={1.5}>{L.evDayDone}</T>}
            </View>

            {/* 4. one action */}
            {!!target && (
              <Button title={L.evStart} icon={target.kind === 'recall' ? 'sparkle' : 'play'} onPress={act} hint={headline} />
            )}
          </Card>
        ) : (
          <Card tone="hero" pad={18}>
            <Btn pressScale={0.99} onPress={() => router.push('/exam/new')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: accent.tint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" size={20} color={accent.fg} stroke={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <T f="display" w={700} s="heading">{L.evNoExam}</T>
                <T w={500} s="caption" c={C.ink2} lh={1.5} style={{ marginTop: 2 }}>{L.evNoExamSub}</T>
              </View>
            </Btn>
          </Card>
        )}

        <WeeklyRecapCard />

        {/* Today's schedule */}
        <SectionHeader title={L.todaySchedule} action={{ label: L.plan, onPress: () => router.push('/plan') }} />
        {agenda.length ? <Timeline items={agenda} /> : (
          <EmptyState icon="calendar" title={L.emptyTodayT} body={L.emptyTodayS} action={{ label: L.qaTitle, onPress: () => setQuick(true) }} />
        )}

        {/* Triage, last and only when today is genuinely overcommitted. No blame in the copy. */}
        {behind.behind && (
          <Btn pressScale={0.99} onPress={() => router.push('/rescue')} accessibilityLabel={L.rescueMenu}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.warningTint }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="reset" size={17} color={C.warningText} stroke={2.2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T w={700} s="label" c={C.warningText}>{L.behindTitle}</T>
              <T w={500} s="caption" c={C.warningText} style={{ marginTop: 1 }}>{L.behindLoad}</T>
            </View>
            <View style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: C.card }}>
              <T w={700} s="caption" c={C.warningText}>{L.rebuild}</T>
            </View>
          </Btn>
        )}

        <ActivationChecklist />
      </ScrollView>
    </View>
  );
}
