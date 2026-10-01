import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { ProgressRing, SubjectTile } from '../../components/Academic';
import { Timeline } from '../../components/Agenda';
import { ActivationChecklist, StreakChip, WeeklyRecapCard } from '../../components/Habits';
import { Avatar } from '../../components/Page';
import { Btn, Card, Icon, SectionHeader, T } from '../../components/ui';
import { ai } from '../../ai';
import { agendaFor, overallReadiness, semesterProgress } from '../../engine/academic';
import { hours, reasonText, useAcademic } from '../../lib/academic';
import { addDays } from '../../lib/exams';
import { fmtDateLine, relDay } from '../../lib/format';
import { useChrome } from '../../lib/layout';
import { useNazzim } from '../../lib/store';

// TODAY answers one question: "What should I do right now?"
// One primary action (the next move), then the context that explains it: progress, load, deadline, the day's plan.
export default function Today() {
  const { C, L, ar, accent, me, today, startFocusOn, toggleTask, setQuick } = useNazzim();
  const { headerTop, scrollBottom } = useChrome();
  const { ctx, chapterTitle, subjectById, studyStart } = useAcademic();

  const next = ai.recommendNextAction(ctx, chapterTitle);
  const behind = ai.assessBehind(ctx);
  const agenda = agendaFor(ctx, today, { exam: L.kExam, task: L.kTaskB, kind: k => ({ learn: L.kLearn, review: L.kReview, mock: L.kMock })[k] }, chapterTitle, studyStart);
  const load = ai.analyzeAcademicLoad(ctx, today, 7);
  // One headline number, and it is the one that matters: readiness for the exams still ahead. With no exam
  // to be ready for there is nothing to be ready *for*, so we show task completion and say so.
  const ready = overallReadiness(ctx);
  const headline = ready ?? semesterProgress(ctx);
  const headlineLabel = ready === undefined ? L.glanceNoExam : L.glanceSemester;
  const hour = new Date().getHours();
  const greet = L.greetings[hour < 12 ? 0 : hour < 18 ? 1 : 2];

  const loadColor = { light: C.successText, moderate: C.warningText, heavy: C.danger }[load.level];
  const loadIdx = { light: 0, moderate: 1, heavy: 2 }[load.level];

  const nextSubject = 'subjectId' in next && next.subjectId ? subjectById.get(next.subjectId) : undefined;
  const blocks = agenda.filter(a => a.kind !== 'exam');
  const doneN = blocks.filter(b => b.done).length;
  const leftMin = blocks.filter(b => !b.done).reduce((a, b) => a + b.minutes, 0);
  const nextExam = ctx.exams.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];

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
            {/* Where the day stands, in one line */}
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
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: accent.tint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={18} color={accent.strong} stroke={2.6} />
          </Btn>
          <Btn label={L.profile} onPress={() => router.push('/profile')} pressScale={0.94}>
            <Avatar name={me.name} size={40} />
          </Btn>
        </View>

        {/* YOUR NEXT MOVE */}
        <View style={{ backgroundColor: C.card, borderRadius: 24, borderWidth: 1, borderColor: C.line, padding: 18, gap: 14, boxShadow: C.shadowSoft }}>
          <T w={800} s="micro" ls={ar ? 0 : 1.2} c={C.ink3}>{L.nextMove}</T>
          {next.kind === 'session' || next.kind === 'task' ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <SubjectTile subject={nextSubject} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  {!!nextSubject && <T w={700} s="caption" c={C.ink3}>{nextSubject.name}</T>}
                  <T f="display" w={700} s="heading" lh={1.25} ls={ar ? 0 : -0.4} style={{ marginTop: 1 }}>{next.title}</T>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon name="clock" size={15} color={C.ink3} />
                  <T w={600} s="caption" c={C.ink2}>{`${next.minutes} ${L.min}`}</T>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon name={next.reason.code === 'overdue' ? 'alert' : 'calendar'} size={15} color={next.reason.code === 'overdue' ? C.warningText : C.ink3} />
                  <T w={600} s="caption" c={next.reason.code === 'overdue' ? C.warningText : C.ink2}>{reasonText(next.reason, L)}</T>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn pressedBg={accent.strong}
                  onPress={() => startFocusOn(`${next.title}${nextSubject ? ' · ' + nextSubject.name : ''}`, { kind: next.kind, id: next.id }, next.minutes)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: accent.a1, boxShadow: accent.glow }}>
                  <Icon name="play" size={14} color={C.onAccent} />
                  <T w={700} s="label" c={C.onAccent}>{L.startSession}</T>
                </Btn>
                {next.kind === 'task' && (
                  <Btn label={L.markDoneA} onPress={() => toggleTask(next.id)}
                    style={{ width: 50, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={18} color={C.ink2} stroke={2.4} />
                  </Btn>
                )}
              </View>
            </>
          ) : (
            <Btn pressScale={0.99} onPress={() => next.kind === 'addExam' && router.push('/planner')} disabled={next.kind !== 'addExam'}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: next.kind === 'clear' ? C.successTint : accent.tint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={next.kind === 'clear' ? 'check' : 'plus'} size={20} color={next.kind === 'clear' ? C.successText : accent.fg} stroke={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <T f="display" w={700} s="heading">{next.kind === 'clear' ? L.nextClear : L.nextAdd}</T>
                <T w={500} s="caption" c={C.ink2} style={{ marginTop: 2 }}>{next.kind === 'clear' ? L.nextClearSub : L.nextAddSub}</T>
              </View>
            </Btn>
          )}
        </View>

        {/* Calm nudge into Rescue Mode when work has piled up */}
        {behind.behind && (
          <Btn pressScale={0.99} onPress={() => router.push('/rescue')} accessibilityLabel={L.rescueMenu}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.warningTint }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="reset" size={17} color={C.warningText} stroke={2.2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T w={700} s="label" c={C.warningText}>{L.behindTitle}</T>
              <T w={500} s="caption" c={C.warningText} style={{ marginTop: 1 }}>
                {behind.overdue ? L.behindOverdue.replace('{n}', String(behind.overdue)) : L.behindLoad}
              </T>
            </View>
            <View style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: C.card }}>
              <T w={700} s="caption" c={C.warningText}>{L.rebuild}</T>
            </View>
          </Btn>
        )}

        <WeeklyRecapCard />
        <ActivationChecklist />

        {/* At a glance: three numbers, one card, each opens its detail */}
        <Card pad={0}>
          <View style={{ flexDirection: 'row' }}>
            <Btn pressScale={0.98} onPress={() => router.push(nextExam ? `/readiness/${nextExam.id}` : '/progress')} label={`${headlineLabel} ${headline}%`} style={{ flex: 1, padding: 14, gap: 6, alignItems: 'flex-start' }}>
              <T w={600} s="caption" c={C.ink3} numberOfLines={1}>{headlineLabel}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ProgressRing value={headline} size={26} stroke={3.5} label="" />
                <T f="grotesk" w={700} s="heading">{`${headline}%`}</T>
              </View>
            </Btn>
            <View style={{ width: 1, backgroundColor: C.line2, marginVertical: 12 }} />
            <Btn pressScale={0.98} onPress={() => router.push('/plan')} style={{ flex: 1, padding: 14, gap: 6, alignItems: 'flex-start' }}>
              <T w={600} s="caption" c={C.ink3}>{L.glanceWeek}</T>
              <T f="display" w={700} s="heading" c={loadColor}>{L.loadLevels[loadIdx]}</T>
              <T w={600} s="caption" c={C.ink3}>{hours(load.total, ar)}</T>
            </Btn>
            <View style={{ width: 1, backgroundColor: C.line2, marginVertical: 12 }} />
            <Btn pressScale={0.98} disabled={!nextExam} onPress={() => nextExam && router.push(`/exam/${nextExam.id}`)} style={{ flex: 1.15, padding: 14, gap: 6, alignItems: 'flex-start' }}>
              <T w={600} s="caption" c={C.ink3}>{L.glanceExam}</T>
              <T w={700} s="label" numberOfLines={1}>{nextExam ? nextExam.subject : L.glanceNone}</T>
              {!!nextExam && <T w={700} s="caption" c={nextExam.date <= addDays(today, 3) ? C.warningText : accent.fg}>{relDay(nextExam.date, today, L, ar)}</T>}
            </Btn>
          </View>
        </Card>

        {/* Today's schedule as a timeline */}
        <SectionHeader title={L.todaySchedule} action={{ label: L.plan, onPress: () => router.push('/plan') }} />
        {agenda.length ? <Timeline items={agenda} /> : (
          <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 22 }}>
            <Icon name="calendar" size={24} color={accent.fg} />
            <T w={700} s="body">{L.emptyTodayT}</T>
            <T w={500} s="label" c={C.ink3} style={{ textAlign: 'center', maxWidth: 280 }}>{L.emptyTodayS}</T>
            <Btn onPress={() => setQuick(true)} style={{ marginTop: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 99, backgroundColor: accent.tint }}>
              <T w={700} s="label" c={accent.strong}>{L.qaTitle}</T>
            </Btn>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
