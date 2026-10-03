import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Timeline, WeekLoad } from '../../components/Agenda';
import { ExamCard } from '../../components/Study';
import { Btn, Card, Icon, SectionHeader, T } from '../../components/ui';
import { agendaFor, analyzeAcademicLoad } from '../../engine/academic';
import { useAcademic } from '../../lib/academic';
import { addDays, fromKey } from '../../lib/exams';
import { fmtDate } from '../../lib/format';
import { useChrome } from '../../lib/layout';
import { useNazzim } from '../../lib/store';

// PLAN: the week at a glance, then everything on the chosen day (study, tasks, exams), then upcoming exams.
export default function Plan() {
  const { C, L, ar, accent, day, setDay, today, exams, study, tasks } = useNazzim();
  const { headerTop, scrollBottom } = useChrome();
  const { ctx, chapterTitle, studyStart } = useAcademic();
  // The calendar week (Sun–Sat) that contains today.
  const start = addDays(today, -fromKey(today).getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const upcoming = exams.filter(e => e.date > today);
  const agenda = agendaFor(ctx, day, { exam: L.kExam, task: L.kTaskB, kind: k => ({ learn: L.kLearn, review: L.kReview, mock: L.kMock })[k] }, chapterTitle, studyStart);
  const blocks = agenda.filter(a => a.kind !== 'exam');
  const load = analyzeAcademicLoad(ctx, today, 7);
  const openTasks = tasks.filter(x => !x.done).length;

  return (
    <View style={{ flex: 1, direction: ar ? 'rtl' : 'ltr' }}>
      <View style={{ paddingTop: headerTop, paddingHorizontal: 18, paddingBottom: 14, backgroundColor: C.header, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <T f="display" w={700} s="display" ls={ar ? 0 : -0.8} accessibilityRole="header">{L.plan}</T>
            <T w={600} s="caption" c={C.ink3} style={{ marginTop: 2 }}>{L.planSub}</T>
          </View>
          {/* Labelled, not an icon alone: people tap what they can read */}
          <Btn label={L.planExamCta} onPress={() => router.push('/planner')} pressScale={0.96}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 99, backgroundColor: accent.tint }}>
            <Icon name="sparkle" size={14} color={accent.strong} stroke={2.2} />
            <T w={700} s="label" c={accent.strong}>{L.smartPlan}</T>
          </Btn>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
          {days.map((k, i) => {
            const on = day === k;
            const isToday = k === today;
            const exam = exams.some(e => e.date === k);
            const has = study.some(s => s.date === k && !s.done) || tasks.some(t => t.due === k && !t.done);
            return (
              <Btn key={k} accessibilityState={{ selected: on }} accessibilityLabel={fmtDate(k, L)} onPress={() => setDay(k)}
                style={[
                  { flex: 1, alignItems: 'center', gap: 3, paddingTop: 9, paddingBottom: 8, borderRadius: 12 },
                  on ? { backgroundColor: accent.a1 } : { backgroundColor: C.card, borderWidth: 1, borderColor: isToday ? accent.a1 : C.line },
                ]}>
                <T w={700} s="micro" c={on ? C.onHero2 : isToday ? accent.fg : C.ink3}>{L.dow[i]}</T>
                <T num="data" w={700} s="body" c={on ? C.onAccent : C.ink}>{String(fromKey(k).getDate())}</T>
                {/* Square = exam day, dot = something planned */}
                <View style={{ width: 5, height: 5, borderRadius: exam ? 1 : 3, backgroundColor: exam ? (on ? C.onAccent : C.warning) : has ? (on ? C.onAccent : accent.a1) : 'transparent' }} />
              </Btn>
            );
          })}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 18, paddingBottom: scrollBottom, gap: 14 }}>
        <SectionHeader title={fmtDate(day, L)} meta={blocks.length ? `${blocks.filter(x => x.done).length} / ${blocks.length}` : undefined} />
        {agenda.length ? <Timeline items={agenda} /> : (
          <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 20 }}>
            <Icon name="calendar" size={22} color={C.ink3} />
            <T w={600} s="label" c={C.ink3}>{L.nothingDay}</T>
          </Card>
        )}

        {/* Every task, in the smart order, one tap away from the day it is scheduled on. */}
        <Btn onPress={() => router.push('/tasks')} pressScale={0.99} accessibilityLabel={L.tkAll}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
          <Icon name="check" size={18} color={accent.fg} stroke={2.4} />
          <T w={700} s="label" style={{ flex: 1 }}>{L.tkAll}</T>
          {openTasks > 0 && <T w={700} s="caption" c={C.ink3}>{L.tkOpenN.replace('{n}', String(openTasks))}</T>}
          <Icon name="chevron" size={15} color={C.ink3} stroke={2.3} flip={ar} />
        </Btn>

        <SectionHeader title={L.examsL} action={{ label: L.exAdd, onPress: () => router.push('/planner') }} />
        {upcoming.map(e => <ExamCard key={e.id} exam={e} />)}
        {!upcoming.length && <T w={600} s="label" c={C.ink3} style={{ paddingHorizontal: 4 }}>{L.exNone}</T>}

        {/* The week ahead answers the question a single day cannot: where the heavy day is. It also gives the
            screen something true to say on a light day, instead of ending in empty space. */}
        <SectionHeader title={L.weekAhead} />
        <WeekLoad days={load.days} minutes={load.minutesPerDay} selected={day} today={today} onPick={setDay} />
      </ScrollView>
    </View>
  );
}
