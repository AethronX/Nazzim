import { router } from 'expo-router';
import { View } from 'react-native';
import { Bar, ProgressRing, SubjectTile } from '../components/Academic';
import { Page, Section } from '../components/Page';
import { Btn, Eyebrow, Icon, T, type IconName } from '../components/ui';
import { generateStudyInsights, summarizeProgress, type Insight } from '../engine/insights';
import { limitsFor } from '../config/plans';
import { hours, useAcademic } from '../lib/academic';
import type { Copy } from '../lib/copy';
import { useNazzim } from '../lib/store';
import { swatch } from '../lib/theme';

const BAR_MAX = 84;

// PROGRESS: "how am I doing?" in a few seconds. Every number is computed from real activity.
export default function Progress() {
  const { C, L, ar, accent, scheme, focusLog, gamification, level, xpIn, tier } = useNazzim();
  const { ctx, subjectById } = useAcademic();
  const p = summarizeProgress(ctx, focusLog);
  const insights = generateStudyInsights(ctx, focusLog, limitsFor(tier).insights);
  const maxMin = Math.max(30, ...p.week.map(d => d.minutes));

  return (
    <Page title={L.me} sub={L.meSub}>
      {/* Semester + two headline stats */}
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ flex: 1 }}>
            <T f="display" w={700} s={16}>{L.prSemester}</T>
            {gamification && <T w={600} s={11.5} c={C.ink3} style={{ marginTop: 3 }}>{`${L.level.charAt(0) + L.level.slice(1).toLowerCase()} ${level} · ${xpIn}/1000 XP`}</T>}
          </View>
          <ProgressRing value={p.semester} size={64} stroke={6} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat icon="clock" value={`${p.consistency}%`} label={L.prConsistency} sub={L.prActive.replace('{n}', String(p.activeDays))} />
          <Stat icon="check" value={p.tasksTotal ? `${p.tasksPct}%` : '–'} label={L.prTasks} sub={L.prTasksN.replace('{d}', String(p.tasksDone)).replace('{t}', String(p.tasksTotal))} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: C.card2 }}>
          <Icon name="target" size={16} color={accent.fg} />
          <T w={600} s={12.5} c={C.ink2} style={{ flex: 1 }}>{L.prWeek}</T>
          <T f="grotesk" w={700} s={16}>{hours(p.weekMinutes, ar)}</T>
        </View>
      </View>

      {/* Insights: few, specific, each one leads somewhere useful */}
      <View style={{ gap: 8, marginTop: 6 }}>
        <View style={{ paddingHorizontal: 4 }}><Eyebrow>{L.prInsights}</Eyebrow></View>
        {insights.map((it, i) => {
          const tone = insightTone(it, C, accent);
          const go = insightTarget(it);
          return (
            <Btn key={i} pressScale={go ? 0.99 : 1} disabled={!go} onPress={() => go && router.push(go)}
              style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 16, backgroundColor: tone.bg }}>
              <Icon name={tone.icon} size={16} color={tone.fg} stroke={2.3} />
              <T w={600} s={13} lh={1.45} c={tone.fg} style={{ flex: 1 }}>{insightText(it, L, ar)}</T>
              {!!go && <Icon name="chevron" size={14} color={tone.fg} flip={ar} />}
            </Btn>
          );
        })}
      </View>

      {/* Focus minutes, this calendar week */}
      <Section label={L.prWeekBars}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 132, padding: 14 }}>
          {p.week.map((d, i) => {
            const h = d.future ? 6 : Math.max(6, Math.round((d.minutes / maxMin) * BAR_MAX));
            return (
              <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 5 }} accessible accessibilityLabel={`${L.dow[i]} ${d.minutes} ${L.min}`}>
                {/* Values as text so bars don't carry meaning alone (WCAG 1.4.11). */}
                <T f="grotesk" w={700} s={9.5} c={d.isToday ? accent.fg : C.ink3}>{d.future ? '–' : String(d.minutes)}</T>
                <View style={{ width: '100%', height: h, borderRadius: 6, backgroundColor: d.isToday ? accent.fg : d.future || !d.minutes ? C.line2 : accent.tint2 }} />
                <T w={d.isToday ? 800 : 700} s={9.5} c={d.isToday ? accent.fg : C.ink3}>{L.dow[i]}</T>
              </View>
            );
          })}
        </View>
      </Section>

      {/* Per subject: work done and readiness for the next exam */}
      <Section label={L.prSubjects}>
        {p.subjects.map((s, i) => {
          const subj = subjectById.get(s.id)!;
          const sw = swatch(subj.color, scheme);
          return (
            <Btn key={s.id} pressScale={1} onPress={() => router.push(`/subject/${s.id}`)}
              style={{ paddingVertical: 12, paddingHorizontal: 14, gap: 8, borderBottomWidth: i === p.subjects.length - 1 ? 0 : 1, borderBottomColor: C.line2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <SubjectTile subject={subj} size={28} />
                <T w={700} s={13.5} style={{ flex: 1 }} numberOfLines={1}>{subj.name}</T>
                <T f="grotesk" w={700} s={13} c={sw.fg}>{`${s.progress}%`}</T>
              </View>
              <Bar value={s.progress} color={sw.fg} height={5} />
              {s.readiness !== undefined && <T w={600} s={11} c={C.ink3}>{L.prReady.replace('{n}', String(s.readiness))}</T>}
            </Btn>
          );
        })}
        {!p.subjects.length && <T w={600} s={13} c={C.ink3} style={{ padding: 14 }}>{L.prNoSubjects}</T>}
      </Section>
    </Page>
  );
}

function Stat({ icon, value, label, sub }: { icon: IconName; value: string; label: string; sub: string }) {
  const { C, accent } = useNazzim();
  return (
    <View style={{ flex: 1, minWidth: 0, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: C.line, gap: 3 }}>
      <Icon name={icon} size={15} color={accent.fg} />
      <T w={600} s={11.5} c={C.ink3} style={{ marginTop: 4 }}>{label}</T>
      <T f="grotesk" w={700} s={20}>{value}</T>
      <T w={600} s={11} c={C.ink3}>{sub}</T>
    </View>
  );
}

type Tone = { bg: string; fg: string; icon: IconName };
function insightTone(it: Insight, C: ReturnType<typeof useNazzim>['C'], accent: ReturnType<typeof useNazzim>['accent']): Tone {
  switch (it.code) {
    case 'examAtRisk': case 'behind': case 'heavierNextWeek': return { bg: C.warningTint, fg: C.warningText, icon: 'alert' };
    case 'readinessUp': case 'consistency': return { bg: C.successTint, fg: C.successText, icon: 'chart' };
    default: return { bg: accent.tint, fg: accent.strong, icon: 'sparkle' };
  }
}
function insightTarget(it: Insight): string | null {
  switch (it.code) {
    case 'examAtRisk': case 'readinessUp': return `/exam/${it.examId}`;
    case 'behind': return '/rescue';
    case 'heavierNextWeek': return '/plan';
    case 'start': return '/';
    default: return null;
  }
}
function insightText(it: Insight, L: Copy, ar: boolean): string {
  switch (it.code) {
    case 'examAtRisk': return (it.days === 1 ? L.iAtRisk1 : L.iAtRisk).replace('{exam}', it.exam).replace('{n}', String(it.days)).replace('{r}', String(it.readiness));
    case 'behind': return L.iBehind.replace('{n}', String(it.overdue));
    case 'readinessUp': return L.iUp.replace('{exam}', it.exam).replace('{n}', String(it.delta));
    case 'heavierNextWeek': return L.iHeavier.replace('{n}', hours(it.next, ar)).replace('{c}', hours(it.current, ar));
    case 'consistency': return L.iConsistency.replace('{n}', String(it.days));
    case 'start': return L.iStart;
  }
}
