import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Bar, SubjectTile } from '../../components/Academic';
import { AgendaRow } from '../../components/Agenda';
import { Avatar } from '../../components/Page';
import { Btn, Icon, T } from '../../components/ui';
import { ai } from '../../ai';
import { agendaFor, semesterProgress } from '../../engine/academic';
import { hours, reasonText, useAcademic } from '../../lib/academic';
import { fmtDateLine, relDay } from '../../lib/format';
import { useChrome } from '../../lib/layout';
import { useNazzim } from '../../lib/store';

// TODAY answers one question: "What should I do right now?"
// One primary action (the next move), then the context that explains it: progress, load, deadline, the day's plan.
export default function Today() {
  const { C, L, ar, accent, me, today, startFocusOn, toggleTask, setQuick } = useNazzim();
  const { headerTop, scrollBottom } = useChrome();
  const { ctx, chapterTitle, subjectById } = useAcademic();

  const next = ai.recommendNextAction(ctx, chapterTitle);
  const behind = ai.assessBehind(ctx);
  const agenda = agendaFor(ctx, today, { exam: L.kExam, task: L.kTaskB, kind: k => ({ learn: L.kLearn, review: L.kReview, mock: L.kMock })[k] }, chapterTitle);
  const load = ai.analyzeAcademicLoad(ctx, today, 7);
  const progress = semesterProgress(ctx);
  const hour = new Date().getHours();
  const greet = L.greetings[hour < 12 ? 0 : hour < 18 ? 1 : 2];

  // Nearest open deadline: an exam or a task.
  const deadlines = [
    ...ctx.exams.filter(e => e.date >= today).map(e => ({ key: 'e' + e.id, title: `${L.kExam} · ${e.subject}`, date: e.date, subjectId: e.subjectId })),
    ...ctx.tasks.filter(t => !t.done && t.due >= today).map(t => ({ key: 't' + t.id, title: t.title, date: t.due, subjectId: t.subjectId })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const deadline = deadlines[0];
  const loadColor = { light: C.successText, moderate: C.warningText, heavy: C.danger }[load.level];
  const loadIdx = { light: 0, moderate: 1, heavy: 2 }[load.level];

  const nextSubject = 'subjectId' in next && next.subjectId ? subjectById.get(next.subjectId) : undefined;

  return (
    <View style={{ flex: 1, direction: ar ? 'rtl' : 'ltr' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: headerTop, paddingHorizontal: 18, paddingBottom: scrollBottom, gap: 14 }}>
        {/* Greeting */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T w={700} s={11} ls={ar ? 0 : 0.6} c={C.ink3}>{fmtDateLine(today, L, ar)}</T>
            <T f="display" w={700} s={23} ls={ar ? 0 : -0.8} style={{ marginTop: 2 }} accessibilityRole="header" numberOfLines={2}>
              {me.name ? `${greet}${ar ? '، ' : ', '}${me.name.split(/\s+/)[0]}` : greet}
            </T>
          </View>
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
          <T w={800} s={10.5} ls={ar ? 0 : 1.2} c={C.ink3}>{L.nextMove}</T>
          {next.kind === 'session' || next.kind === 'task' ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <SubjectTile subject={nextSubject} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  {!!nextSubject && <T w={700} s={12} c={C.ink3}>{nextSubject.name}</T>}
                  <T f="display" w={700} s={19} lh={1.25} ls={ar ? 0 : -0.4} style={{ marginTop: 1 }}>{next.title}</T>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon name="clock" size={15} color={C.ink3} />
                  <T w={600} s={12.5} c={C.ink2}>{`${next.minutes} ${L.min}`}</T>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon name={next.reason.code === 'overdue' ? 'alert' : 'calendar'} size={15} color={next.reason.code === 'overdue' ? C.warningText : C.ink3} />
                  <T w={600} s={12.5} c={next.reason.code === 'overdue' ? C.warningText : C.ink2}>{reasonText(next.reason, L)}</T>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn pressedBg={accent.strong}
                  onPress={() => startFocusOn(`${next.title}${nextSubject ? ' · ' + nextSubject.name : ''}`, { kind: next.kind, id: next.id }, next.minutes)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: accent.a1, boxShadow: accent.glow }}>
                  <Icon name="play" size={14} color={C.onAccent} />
                  <T w={700} s={14.5} c={C.onAccent}>{L.startSession}</T>
                </Btn>
                {next.kind === 'task' && (
                  <Btn label={L.markDoneA} onPress={() => toggleTask(next.id)}
                    style={{ width: 50, borderRadius: 14, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={18} color={C.ink2} stroke={2.4} />
                  </Btn>
                )}
              </View>
            </>
          ) : (
            <Btn pressScale={0.99} onPress={() => next.kind === 'addExam' && router.push('/planner')} disabled={next.kind !== 'addExam'}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: next.kind === 'clear' ? C.successTint : accent.tint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={next.kind === 'clear' ? 'check' : 'plus'} size={20} color={next.kind === 'clear' ? C.successText : accent.fg} stroke={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <T f="display" w={700} s={17}>{next.kind === 'clear' ? L.nextClear : L.nextAdd}</T>
                <T w={500} s={12.5} c={C.ink2} style={{ marginTop: 2 }}>{next.kind === 'clear' ? L.nextClearSub : L.nextAddSub}</T>
              </View>
            </Btn>
          )}
        </View>

        {/* Calm nudge into Rescue Mode when work has piled up */}
        {behind.behind && (
          <Btn pressScale={0.99} onPress={() => router.push('/rescue')} accessibilityLabel={L.rescueMenu}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: C.warningTint }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="reset" size={17} color={C.warningText} stroke={2.2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T w={700} s={13.5} c={C.warningText}>{L.behindTitle}</T>
              <T w={500} s={12} c={C.warningText} style={{ marginTop: 1 }}>
                {behind.overdue ? L.behindOverdue.replace('{n}', String(behind.overdue)) : L.behindLoad}
              </T>
            </View>
            <View style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: C.card }}>
              <T w={700} s={12} c={C.warningText}>{L.rebuild}</T>
            </View>
          </Btn>
        )}

        {/* Semester progress */}
        <View style={{ backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <T w={700} s={13}>{L.overall}</T>
            <T f="grotesk" w={700} s={15} c={accent.fg}>{`${progress}%`}</T>
          </View>
          <Bar value={progress} />
        </View>

        {/* Load + next deadline */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14, gap: 4 }}>
            <T w={700} s={11} c={C.ink3}>{L.load}</T>
            <T f="display" w={700} s={17} c={loadColor}>{L.loadLevels[loadIdx]}</T>
            <T w={600} s={11} c={C.ink3}>{L.loadSub.replace('{h}', hours(load.total, ar))}</T>
          </View>
          <Btn pressScale={0.99} disabled={!deadline} onPress={() => deadline?.key.startsWith('e') && router.push(`/exam/${deadline.key.slice(1)}`)}
            style={{ flex: 1, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14, gap: 4 }}>
            <T w={700} s={11} c={C.ink3}>{L.nextDeadline}</T>
            <T w={700} s={14} numberOfLines={2}>{deadline ? deadline.title : L.allClear}</T>
            {!!deadline && <T w={700} s={11.5} c={accent.fg}>{relDay(deadline.date, today, L)}</T>}
          </Btn>
        </View>

        {/* Today's schedule */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
          <T f="display" w={700} s={18} ls={ar ? 0 : -0.4}>{L.todaySchedule}</T>
          {!!agenda.length && <T f="grotesk" w={700} s={12} c={C.ink3}>{`${agenda.filter(a => a.done).length} / ${agenda.filter(a => a.kind !== 'exam').length}`}</T>}
        </View>
        <View style={{ backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
          {agenda.map((a, i) => <AgendaRow key={a.key} item={a} last={i === agenda.length - 1} />)}
          {!agenda.length && <T w={600} s={13} c={C.ink3} style={{ padding: 16 }}>{L.emptyToday}</T>}
        </View>
      </ScrollView>
    </View>
  );
}
