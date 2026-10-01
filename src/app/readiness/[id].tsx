import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Page, Section } from '../../components/Page';
import { Btn, Card, Icon, PrimaryBtn, T } from '../../components/ui';
import { recallStats } from '../../engine/recall';
import { useAcademic } from '../../lib/academic';
import { EFFORT_CEILING, nextEvidence, readinessDetail, WEAK_CEILING } from '../../lib/exams';
import { useNazzim } from '../../lib/store';
import { track } from '../../services/analytics';

// WHY THIS NUMBER: readiness is the one figure the student is asked to trust, so it is never a black box.
// Every chapter shows the three pieces of evidence behind it, what the ceiling is on the evidence so far,
// and the single next thing that would move it. A number you can audit is a number you can believe.
export default function ReadinessWhy() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { C, L, ar, accent, study, cards, today } = useNazzim();
  const { ctx } = useAcademic();
  const exam = ctx.exams.find(e => e.id === id);
  if (!exam) return <Page title={L.rdTitle}><T c={C.ink3}>{L.exNone}</T></Page>;

  const d = readinessDetail(exam, study, today);
  const gap = nextEvidence(exam, study, today);
  const stats = recallStats(cards, exam.id, today);

  const gapText =
    gap.kind === 'study' ? L.rdNextStudy.replace('{c}', exam.chapters[gap.chapter ?? 0] ?? '')
    : gap.kind === 'focus' ? L.rdNextFocus.replace('{c}', exam.chapters[gap.chapter ?? 0] ?? '')
    : gap.kind === 'recall' ? L.rdNextRecall.replace('{c}', exam.chapters[gap.chapter ?? 0] ?? '')
    : gap.kind === 'mock' ? L.rdNextMock : L.rdNextReady;

  return (
    <Page title={L.rdTitle} sub={exam.subject}>
      {/* Where it stands, and the lid the current evidence puts on it */}
      <Card pad={20}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
          <View>
            <T w={600} s={11.5} c={C.ink3}>{L.rdNow}</T>
            <T f="display" w={800} s={40} c={accent.fg} style={{ marginTop: 2 }}>{d.score}%</T>
          </View>
          <View style={{ flex: 1, paddingBottom: 8 }}>
            <Bar track={C.line2} value={d.score} color={accent.fg} />
            <View style={{ marginTop: 10 }}><Bar track={C.line2} value={d.ceiling} color={C.line2} /></View>
            <T w={600} s={11} c={C.ink3} style={{ marginTop: 6 }}>{L.rdMax}: {d.ceiling}%</T>
          </View>
        </View>
        <T w={500} s={13} lh={1.6} c={C.ink2} style={{ marginTop: 14 }}>{L.rdIntro}</T>
      </Card>

      {/* The three pieces of evidence, summed across the exam */}
      <Section label={L.rdEvidence}>
        <View style={{ padding: 16, gap: 16 }}>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T w={600} s={13}>{L.rdCoverage}</T>
              <T w={700} s={13} c={C.ink2}>{d.coverage}%</T>
            </View>
            <Bar track={C.line2} value={d.coverage} color={C.ink3} />
          </View>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T w={600} s={13}>{L.rdEffort}</T>
              <T w={700} s={13} c={C.ink2}>{L.rdEffortVal.replace('{a}', String(d.focusedMin)).replace('{b}', String(d.plannedMin))}</T>
            </View>
            <Bar track={C.line2} value={d.plannedMin ? (d.focusedMin / d.plannedMin) * 100 : 0} color={C.warningText} />
          </View>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T w={600} s={13}>{L.rdRecall}</T>
              <T w={700} s={13} c={C.ink2}>
                {stats.score === undefined ? L.rdRecallNone : L.rdRecallVal.replace('{n}', String(Math.round(stats.score * 100)))}
              </T>
            </View>
            <Bar track={C.line2} value={(stats.score ?? 0) * 100} color={C.successText} />
          </View>
        </View>
      </Section>

      {/* The rule, stated plainly, so nobody has to guess why tapping does not work */}
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, backgroundColor: C.line2, alignItems: 'flex-start' }}>
        <Icon name="shield" size={16} color={C.ink2} stroke={2.2} />
        <T w={500} s={12.5} lh={1.55} c={C.ink2} style={{ flex: 1 }}>
          {L.rdCeiling.replace('{n}', String(Math.round(WEAK_CEILING * 100))).replace('{e}', String(Math.round(EFFORT_CEILING * 100)))}
        </T>
      </View>

      {/* Per chapter */}
      <Section label={L.exChaptersH}>
        {d.chapters.map((c, i) => {
          const idle = c.done && c.decay < 1 ? Math.round((1 - c.decay) * 60) : 0;
          return (
            <View key={c.chapter} style={{ padding: 14, gap: 8, borderBottomWidth: i === d.chapters.length - 1 ? 0 : 1, borderBottomColor: C.line }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <T w={600} s={13.5} style={{ flex: 1 }} numberOfLines={1}>{exam.chapters[c.chapter]}</T>
                <T f="display" w={700} s={15} c={c.score >= 0.7 ? C.successText : c.score >= 0.35 ? C.warningText : C.ink3}>{Math.round(c.score * 100)}%</T>
              </View>
              <Bar track={C.line2} value={c.score * 100} color={c.score >= 0.7 ? C.successText : c.score >= 0.35 ? C.warningText : C.ink3} />
              <T w={600} s={11.5} c={C.ink3}>
                {c.done}/{c.planned} · {c.focusedMin}/{c.plannedMin} {ar ? 'د' : 'min'} · {c.recall === undefined ? L.rdRecallNone : L.rdRecallVal.replace('{n}', String(Math.round(c.recall * 100)))}
              </T>
              {idle > 0 && <T w={600} s={11} c={C.ink3}>{L.rdDecay.replace('{n}', String(idle))}</T>}
            </View>
          );
        })}
      </Section>

      {/* The one next move */}
      <Card pad={16}>
        <T w={700} s={11} ls={ar ? 0 : 0.6} c={C.ink3}>{L.nextMove}</T>
        <T w={600} s={14.5} lh={1.5} style={{ marginTop: 6 }}>{gapText}</T>
      </Card>
      {gap.kind === 'recall' && (
        <PrimaryBtn title={L.rcOpen} icon="sparkle" onPress={() => { track({ name: 'readiness_explained' }); router.replace(`/recall/${exam.id}`); }} />
      )}
      <Btn onPress={() => router.back()} pressScale={0.98} style={{ alignItems: 'center', paddingVertical: 14 }}>
        <T w={700} s={13.5} c={C.ink3}>{L.rcBack}</T>
      </Btn>
    </Page>
  );
}

// Defined at module scope: a component created inside render remounts on every keystroke and loses state.
function Bar({ value, color, track }: { value: number; color: string; track: string }) {
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}
