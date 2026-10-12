import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { SubjectTile } from '../../components/Academic';
import { Page, Section } from '../../components/Page';
import { Button, Btn, EmptyState, T } from '../../components/ui';
import { computeGrade } from '../../engine/grades';
import { useNazzim, DEFAULT_A } from '../../lib/store';

// GRADES HUB: every course with its real earned grade and the one line that matters — what it needs for an A.
// The three numbers are kept apart on purpose: earned points, required-on-remaining, and data status.
export default function GradesHub() {
  const { C, L, ar, subjects, assessments, gradeTargets, seedMyCourses } = useNazzim();
  const G = L.gr;

  const rows = useMemo(() => subjects.map(s => {
    const list = assessments.filter(a => a.subjectId === s.id);
    const target = gradeTargets[s.id] ?? DEFAULT_A;
    return { s, list, g: computeGrade(list, target), target };
  }), [subjects, assessments, gradeTargets]);

  const hasAny = subjects.length > 0;

  const chip = (g: ReturnType<typeof computeGrade>) => {
    const tone =
      g.verdict === 'impossible' ? { bg: C.dangerTint, fg: C.danger }
      : g.verdict === 'needsPush' ? { bg: C.warningTint, fg: C.warningText }
      : g.verdict === 'needData' ? { bg: C.line2, fg: C.ink2 }
      : { bg: C.successTint, fg: C.successText };
    const label =
      g.verdict === 'needData' ? G.needsConfirm
      : g.verdict === 'done' ? G.doneLine.replace('{n}', String(g.earned))
      : g.required !== null && g.verdict !== 'secured' ? `${G.need} ${g.required}%`
      : G.verdict.secured.split('—')[0].trim();
    return (
      <View style={{ alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99, backgroundColor: tone.bg }}>
        <T w={700} s="caption" c={tone.fg}>{label}</T>
      </View>
    );
  };

  return (
    <Page title={G.title} sub={G.sub}>
      {!hasAny ? (
        <EmptyState icon="chart" title={G.hubEmptyT} body={G.hubEmptyS}
          action={{ label: G.seed, icon: 'plus', onPress: seedMyCourses }}
          secondary={{ label: L.addSubject, onPress: () => router.push('/subject/new') }} />
      ) : (
        <Section>
          {rows.map(({ s, g, target, list }, i) => (
            <Btn key={s.id} pressScale={0.99} onPress={() => router.push(`/grades/${s.id}`)}
              accessibilityLabel={`${s.name}, ${G.earned} ${g.earned} ${G.pts}, ${G.aAt.replace('{n}', String(target))}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: C.line2 }}>
              <SubjectTile subject={s} size={40} />
              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <T w={700} s="label" numberOfLines={1}>{s.name}</T>
                {chip(g)}
              </View>
              <View style={{ alignItems: ar ? 'flex-start' : 'flex-end', minWidth: 0 }}>
                <T num="data" w={800} s="title" c={C.ink}>{list.length ? `${g.earned}` : '—'}</T>
                <T w={600} s="micro" c={C.ink3}>{G.aAt.replace('{n}', String(target))}</T>
              </View>
            </Btn>
          ))}
        </Section>
      )}

      {hasAny && !rows.some(r => r.s.name.includes('STAT2101')) && (
        <Button variant="tertiary" title={G.seed} icon="plus" onPress={seedMyCourses} />
      )}
    </Page>
  );
}
