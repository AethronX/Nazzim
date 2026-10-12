import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Page, Section } from '../../components/Page';
import { Button, Btn, Card, Icon, Notice, PrimaryBtn, T } from '../../components/ui';
import { computeGrade, requiredOn, type Assessment } from '../../engine/grades';
import { useNazzim, DEFAULT_A } from '../../lib/store';

// SUBJECT GRADES: the engine made visible. Three numbers kept apart — earned, required-on-remaining, data
// status — plus a per-assessment list where every weight and score is editable, and a what-if calculator.
export default function SubjectGrades() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { C, L, ar, accent, subjects, assessments, gradeTargets, setGradeTarget, updateAssessment } = useNazzim();
  const G = L.gr;
  const subject = subjects.find(s => s.id === id);
  const [whatIf, setWhatIf] = useState<string | null>(null);

  const list = useMemo(() => assessments.filter(a => a.subjectId === id), [assessments, id]);
  const target = gradeTargets[id!] ?? DEFAULT_A;
  const g = useMemo(() => computeGrade(list, target), [list, target]);

  if (!subject) return <Page title={G.title}><T c={C.ink3}>{L.exNone}</T></Page>;

  const stat = (label: string, value: string, color = C.ink, sub?: string) => (
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 2 }}>
      <T num="data" w={800} s="title" ls={-0.5} c={color}>{value}</T>
      <T w={600} s="micro" c={C.ink3} numberOfLines={1} style={{ textAlign: 'center' }}>{label}</T>
      {!!sub && <T w={500} s="micro" c={C.ink3}>{sub}</T>}
    </View>
  );

  const verdictTone =
    g.verdict === 'impossible' ? { bg: C.dangerTint, fg: C.danger, tone: 'caution' as const }
    : g.verdict === 'needsPush' ? { bg: C.warningTint, fg: C.warningText, tone: 'caution' as const }
    : g.verdict === 'needData' ? { bg: C.line2, fg: C.ink2, tone: 'info' as const }
    : { bg: C.successTint, fg: C.successText, tone: 'success' as const };

  const headline =
    g.verdict === 'needData' ? (g.reason ? G.reason[g.reason as keyof typeof G.reason] : G.verdict.needData)
    : g.verdict === 'done' ? G.doneLine.replace('{n}', String(g.earned))
    : g.verdict === 'secured' ? G.securedLine
    : g.verdict === 'impossible' ? G.verdict.impossible
    : g.required !== null ? G.need1.replace('{n}', String(g.required)).replace('{w}', String(g.remainingWeight))
    : G.verdict[g.verdict];

  const upcoming = list.filter(a => a.status !== 'graded' && a.weight > 0 && a.source !== 'unconfirmed');
  const whatIfA = upcoming.find(a => a.id === whatIf);
  const whatIfVal = whatIfA ? requiredOn(list, whatIfA.weight, target) : null;

  const edit = (aid?: string) => router.push(`/grades/assessment?subject=${id}${aid ? `&id=${aid}` : ''}`);

  return (
    <Page title={subject.name} sub={G.title}>
      {/* Target */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }}>
        <T w={700} s="label" c={C.ink2} style={{ flex: 1 }}>{G.target}</T>
        <Btn label="−" onPress={() => setGradeTarget(id!, target - 1)} pressScale={0.9}
          style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
          <T w={700} s="title" c={C.ink2} ltr style={{ marginTop: -2 }}>−</T>
        </Btn>
        <T num="data" w={800} s="title" c={accent.fg} style={{ minWidth: 54, textAlign: 'center' }}>{`${target}%`}</T>
        <Btn label="+" onPress={() => setGradeTarget(id!, target + 1)} pressScale={0.9}
          style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={16} color={C.ink2} stroke={2.4} />
        </Btn>
      </View>

      {/* Summary — three numbers kept apart */}
      <Card tone="hero" pad={18} style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {stat(G.earned, `${g.earned}`, C.ink, G.pts)}
          <View style={{ width: 1, backgroundColor: C.line2 }} />
          {stat(G.need, g.required !== null && g.verdict !== 'secured' && g.verdict !== 'done' ? `${g.required}%` : '—', verdictTone.fg)}
          <View style={{ width: 1, backgroundColor: C.line2 }} />
          {stat(G.max, g.dataStatus === 'complete' ? `${g.maxPossible}` : '—', C.ink, G.pts)}
        </View>
        <Notice tone={verdictTone.tone} body={headline} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Meta label={G.weightSet.replace('{n}', String(g.knownWeight))} C={C} />
          <Meta label={G.gradedN.replace('{n}', String(list.filter(a => a.status === 'graded').length))} C={C} />
          {g.completedWeight > 0 && <Meta label={`${G.avg} ${g.currentOfGraded}%`} C={C} />}
        </View>
      </Card>

      {/* What do I need on… */}
      {upcoming.length > 0 && g.dataStatus === 'complete' && (
        <Section label={G.whatIf}>
          <View style={{ padding: 12, gap: 10 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {upcoming.map(a => {
                const on = a.id === whatIf;
                return (
                  <Btn key={a.id} onPress={() => setWhatIf(on ? null : a.id)} accessibilityState={{ selected: on }}
                    style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: on ? accent.tint : C.card2, borderWidth: 1, borderColor: on ? accent.a1 : C.line }}>
                    <T w={700} s="caption" c={on ? accent.strong : C.ink2}>{a.name} · {a.weight}%</T>
                  </Btn>
                );
              })}
            </View>
            {whatIfA && (
              <T w={700} s="label" c={whatIfVal !== null && whatIfVal > 100 ? C.danger : C.ink}>
                {whatIfVal === null ? G.whatIfImpossible
                  : whatIfVal > 100 ? G.whatIfImpossible
                  : G.whatIfNeed.replace('{n}', String(whatIfVal))}
              </T>
            )}
          </View>
        </Section>
      )}

      {/* Assessments */}
      <Section label={`${G.title} · ${list.length}`}>
        {list.map((a, i) => <Row key={a.id} a={a} last={i === list.length - 1} onEdit={() => edit(a.id)}
          onConfirm={() => updateAssessment(a.id, { source: 'official' })} C={C} L={L} ar={ar} />)}
        {!list.length && <View style={{ padding: 16 }}><T c={C.ink3} s="label">{G.notGraded}</T></View>}
      </Section>

      <PrimaryBtn title={G.add} icon="plus" onPress={() => edit()} />
    </Page>
  );
}

function Meta({ label, C }: { label: string; C: ReturnType<typeof useNazzim>['C'] }) {
  return <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99, backgroundColor: C.card2 }}><T w={600} s="micro" c={C.ink2}>{label}</T></View>;
}

function Row({ a, last, onEdit, onConfirm, C, L, ar }: {
  a: Assessment; last: boolean; onEdit: () => void; onConfirm: () => void;
  C: ReturnType<typeof useNazzim>['C']; L: ReturnType<typeof useNazzim>['L']; ar: boolean;
}) {
  const G = L.gr;
  const unconfirmed = a.source === 'unconfirmed';
  const gradedScore = a.status === 'graded' && a.score !== undefined && a.maxScore ? `${a.score}/${a.maxScore}` : null;
  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line2 }}>
      <Btn pressScale={0.99} onPress={onEdit} accessibilityLabel={`${a.name}, ${a.weight}%, ${G.status[a.status]}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <T w={700} s="label" numberOfLines={1}>{a.name}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <T w={700} s="caption" c={C.ink2}>{a.weight}%</T>
            <T w={600} s="caption" c={a.status === 'graded' ? C.successText : C.ink3}>· {G.status[a.status]}</T>
            {unconfirmed && (
              <View style={{ paddingVertical: 1, paddingHorizontal: 7, borderRadius: 99, backgroundColor: C.warningTint }}>
                <T w={700} s="micro" c={C.warningText}>{G.unconfirmedTag}</T>
              </View>
            )}
          </View>
        </View>
        {gradedScore && <T num="data" w={800} s="heading" c={C.ink}>{gradedScore}</T>}
        <Icon name="chevron" size={15} color={C.ink3} stroke={2.3} flip={ar} />
      </Btn>
      {unconfirmed && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
          <Button variant="secondary" compact title={G.confirm} icon="check" onPress={onConfirm} />
        </View>
      )}
    </View>
  );
}
