import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Page, Section } from '../../components/Page';
import { Btn, Card, Icon, PrimaryBtn, T } from '../../components/ui';
import { dueCards, mastery, recallStats, type Grade } from '../../engine/recall';
import { useAcademic } from '../../lib/academic';
import { counted } from '../../lib/copy';
import { relDay } from '../../lib/format';
import { readiness } from '../../lib/exams';
import { useNazzim } from '../../lib/store';
import { font } from '../../lib/theme';
import { track } from '../../services/analytics';

// SELF-TEST: the only screen that can raise an exam's readiness past the effort ceiling.
//
// The order is deliberate and not negotiable: recall → commit in writing → reveal → grade. Showing the answer
// first turns retrieval practice into re-reading, which is the thing the evidence says does not work. Typing
// the answer before the reveal is what makes the self-grade honest enough to feed a number.
export default function Recall() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { C, L, ar, accent, today, study, cards, gradeCard, deleteCard } = useNazzim();
  const { ctx } = useAcademic();
  const exam = ctx.exams.find(e => e.id === id);

  const [queue, setQueue] = useState<string[] | null>(null);
  const [at, setAt] = useState(0);
  const [typed, setTyped] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  // Readiness as it stood when this session began — state, not a ref, so the finish screen can read it.
  const [readyAtStart, setReadyAtStart] = useState<number | null>(null);

  const stats = useMemo(() => (exam ? recallStats(cards, exam.id, today) : null), [cards, exam, today]);
  const due = useMemo(() => (exam ? dueCards(cards, exam.id, today) : []), [cards, exam, today]);

  if (!exam) return <Page title={L.rcTitle}><T c={C.ink3}>{L.exNone}</T></Page>;

  const input = { fontFamily: font('body', 600, ar), fontSize: 15, color: C.ink, textAlign: ar ? 'right' : 'left' } as const;
  const list = queue ?? [];
  const card = queue ? cards.find(c => c.id === list[at]) : undefined;
  const finished = !!queue && at >= list.length;

  const start = () => {
    setReadyAtStart(exam ? readiness(exam, study, today) : 0);
    setQueue(due.map(c => c.id)); setAt(0); setCorrect(0); setTyped(''); setRevealed(false);
  };

  const grade = (g: Grade) => {
    if (!card) return;
    gradeCard(card.id, g);
    if (g === 2) setCorrect(n => n + 1);
    const next = at + 1;
    setAt(next); setTyped(''); setRevealed(false);
    if (next >= list.length) track({ name: 'recall_session_completed', props: { cards: list.length, correct: correct + (g === 2 ? 1 : 0) } });
  };

  // ── Finished ──
  const readyNow = readiness(exam, study, today);
  const gained = readyAtStart === null ? 0 : Math.max(0, readyNow - readyAtStart);

  if (finished) {
    return (
      <Page title={L.rcDone} sub={exam.subject}>
        <Card pad={22}>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.successTint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={26} color={C.successText} stroke={2.6} />
            </View>
            <T f="display" w={700} s="title">{L.rcScore.replace('{c}', String(correct)).replace('{n}', String(list.length))}</T>
            {/* Peak-end: close on the thing the work was actually for, not on a confetti animation. */}
            {gained > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                <T w={600} s="label" c={C.ink3}>{L.xReadiness}</T>
                <T f="display" w={800} s="title" c={accent.fg}>{readyNow}%</T>
                <T w={700} s="label" c={C.successText}>+{gained}</T>
              </View>
            )}
          </View>
        </Card>
        <PrimaryBtn title={L.rcBack} onPress={() => router.back()} />
      </Page>
    );
  }

  // ── Testing ──
  if (card) {
    const chapter = card.chapter < 0 ? L.exAll : exam.chapters[card.chapter] ?? '';
    return (
      <Page title={L.rcTitle} sub={`${exam.subject} · ${L.rcProgress.replace('{i}', String(at + 1)).replace('{n}', String(list.length))}`}>
        <Card pad={20}>
          <T w={700} s="caption" c={C.ink3} style={{ marginBottom: 8 }}>{chapter.toUpperCase()}</T>
          <T f="display" w={700} s="heading" lh={1.35}>{card.q}</T>
        </Card>

        {!revealed ? (
          <>
            <Section label={L.rcYourAnswer}>
              <TextInput
                value={typed} onChangeText={setTyped} placeholder={L.rcYourAnswerPh} placeholderTextColor={C.ink3}
                multiline textAlignVertical="top" autoFocus
                style={[input, { minHeight: 130, padding: 16, lineHeight: 24 }]}
              />
            </Section>
            {/* Revealing stays locked until something is written: the commitment is the practice. */}
            <PrimaryBtn title={L.rcReveal} onPress={() => setRevealed(true)} disabled={typed.trim().length < 2} />
          </>
        ) : (
          <>
            <Section label={L.rcA}>
              <View style={{ padding: 16 }}><T w={600} s="body" lh={1.55} c={C.ink2}>{card.a}</T></View>
            </Section>
            <T w={700} s="caption" ls={ar ? 0 : 0.6} c={C.ink3} style={{ marginTop: 6, paddingHorizontal: 4 }}>{L.rcGradeQ.toUpperCase()}</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([0, 1, 2] as Grade[]).map(g => {
                const tone = [{ bg: C.dangerTint, fg: C.danger }, { bg: C.warningTint, fg: C.warningText }, { bg: C.successTint, fg: C.successText }][g];
                return (
                  <Btn key={g} onPress={() => grade(g)} pressScale={0.96}
                    style={{ flex: 1, paddingVertical: 15, borderRadius: 16, backgroundColor: tone.bg, alignItems: 'center' }}>
                    <T w={700} s="label" c={tone.fg}>{L.rcGrades[g]}</T>
                  </Btn>
                );
              })}
            </View>
          </>
        )}
      </Page>
    );
  }

  // ── Overview ──
  const nextDue = [...cards.filter(c => c.examId === exam.id)].sort((a, b) => a.due.localeCompare(b.due))[0];
  return (
    <Page title={L.rcTitle} sub={exam.subject}>
      {!stats?.total ? (
        <Card pad={20}>
          <T w={600} s="label" lh={1.6} c={C.ink2}>{L.rcEmpty}</T>
          <T w={600} s="caption" lh={1.55} c={C.ink3} style={{ marginTop: 10 }}>{L.rcEmptyWhy}</T>
        </Card>
      ) : (
        <Card pad={18}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <T f="display" w={700} s="title">{counted(stats.total, 'card', L, ar)}</T>
              <T w={600} s="caption" c={C.ink3} style={{ marginTop: 3 }}>
                {stats.due ? L.rcDue.replace('{n}', String(stats.due)) : L.rcAllCaught.replace('{d}', nextDue ? relDay(nextDue.due, today, L, ar) : '')}
              </T>
            </View>
            {stats.score !== undefined && (
              <View style={{ alignItems: 'center' }}>
                <T f="display" w={800} s="display" c={C.ink}>{Math.round(stats.score * 100)}%</T>
                <T w={600} s="micro" c={C.ink3}>{L.rdRecall}</T>
              </View>
            )}
          </View>
        </Card>
      )}

      {!!stats?.due && <PrimaryBtn title={L.rcOpen} icon="sparkle" onPress={start} />}
      <PrimaryBtn title={L.rcAdd} icon="plus" onPress={() => router.push(`/recall/new?exam=${exam.id}`)} />

      {!!stats?.total && (
        <Section label={L.rcTitle}>
          {cards.filter(c => c.examId === exam.id).map((c, i, arr) => {
            const m = mastery(c);
            const dot = m === undefined ? C.line2 : m >= 0.65 ? C.successText : m >= 0.5 ? C.warningText : C.danger;
            return (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: C.line }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T w={600} s="label" numberOfLines={2}>{c.q}</T>
                  <T w={600} s="caption" c={C.ink3} style={{ marginTop: 2 }}>
                    {c.chapter < 0 ? L.exAll : exam.chapters[c.chapter] ?? ''}
                  </T>
                </View>
                <Btn label={L.rcDelete} onPress={() => deleteCard(c.id)} pressScale={0.9} style={{ padding: 6 }}>
                  <Icon name="trash" size={16} color={C.ink3} />
                </Btn>
              </View>
            );
          })}
        </Section>
      )}
    </Page>
  );
}
