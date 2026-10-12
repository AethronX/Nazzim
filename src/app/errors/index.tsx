import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Choice, Page, Section } from '../../components/Page';
import { Btn, Button, Card, EmptyState, Icon, PrimaryBtn, T } from '../../components/ui';
import { byKind, dueErrors, summarize } from '../../engine/errors';
import type { StudyError } from '../../domain/types';
import { relDay } from '../../lib/format';
import { useNazzim } from '../../lib/store';

type Filter = 'due' | 'open' | 'all';

// MISTAKE LOG: one list across every course. The re-test queue comes first, then the pattern report — which
// kind of mistake is actually costing marks, ranked by how often it comes back.
export default function ErrorLog() {
  const { C, L, ar, today, subjects, errors, markErrorRepeated, resolveErrorItem } = useNazzim();
  const E = L.er;
  // Default to the re-test queue only when something is due; otherwise a freshly logged mistake would
  // land on an empty list (its first re-test is days away).
  const [filter, setFilter] = useState<Filter>(() => (dueErrors(errors, today).length ? 'due' : 'open'));

  const sum = useMemo(() => summarize(errors, today), [errors, today]);
  const due = useMemo(() => dueErrors(errors, today), [errors, today]);
  const kinds = useMemo(() => byKind(errors), [errors]);
  const list = useMemo(() => {
    if (filter === 'due') return due;
    const open = errors.filter(e => !e.resolved);
    return filter === 'open' ? open : errors;
  }, [filter, due, errors]);

  const nameOf = (e: StudyError) => subjects.find(s => s.id === e.subjectId)?.name ?? '';

  if (!errors.length) {
    return (
      <Page title={E.title} sub={E.sub}>
        <EmptyState icon="alert" title={E.emptyT} body={E.emptyS}
          action={{ label: E.add, onPress: () => router.push('/errors/new') }} />
      </Page>
    );
  }

  return (
    <Page title={E.title} sub={E.sub}>
      <Card tone="hero" pad={18} style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([[E.due, String(sum.due), sum.due ? C.warningText : C.ink],
             [E.open, String(sum.open), C.ink],
             [E.resolvedN, String(sum.resolved), C.successText],
             [E.chronic, String(sum.chronic), sum.chronic ? C.danger : C.ink]] as const).map(([label, value, color]) => (
            <View key={label} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <T num="data" w={800} s="title" ls={-0.5} c={color}>{value}</T>
              <T w={600} s="micro" c={C.ink3} numberOfLines={1} style={{ textAlign: 'center' }}>{label}</T>
            </View>
          ))}
        </View>
        {kinds.length > 0 && (
          <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 12 }}>
            <T w={800} s="micro" ls={ar ? 0 : 1} c={C.ink3}>{E.allKinds}</T>
            {kinds.slice(0, 3).map(k => {
              const share = kinds[0].count ? (k.count / kinds.reduce((t, x) => t + x.count, 0)) : 0;
              return (
                <View key={k.kind} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <T w={700} s="caption" style={{ flex: 1 }}>{E.kinds[k.kind]}</T>
                    <T num="data" w={700} s="caption" c={C.ink2}>{k.count}</T>
                    {k.repeats > 0 && <T w={600} s="micro" c={C.danger}>{E.repeatsN.replace('{n}', String(k.repeats))}</T>}
                  </View>
                  <View style={{ height: 6, borderRadius: 6, backgroundColor: C.line2, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.round(share * 100)}%`, height: 6, borderRadius: 6, backgroundColor: C.warning }} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      <Choice options={['due', 'open', 'all'] as const} value={filter} onChange={setFilter}
        labels={[`${E.due} ${sum.due}`, `${E.open} ${sum.open}`, `${E.all} ${sum.total}`]} />

      <Section>
        {list.map((e, i) => (
          <View key={e.id} style={{ borderBottomWidth: i === list.length - 1 ? 0 : 1, borderBottomColor: C.line2 }}>
            <Btn pressScale={0.99} onPress={() => router.push(`/errors/new?id=${e.id}`)} accessibilityLabel={e.question}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 }}>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <T w={700} s="label" numberOfLines={2} style={e.resolved ? { textDecorationLine: 'line-through', color: C.ink3 } : null}>{e.question}</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                  <View style={{ paddingVertical: 1, paddingHorizontal: 7, borderRadius: 99, backgroundColor: C.card2 }}>
                    <T w={700} s="micro" c={C.ink2}>{E.kinds[e.kind]}</T>
                  </View>
                  {!!nameOf(e) && <T w={600} s="caption" c={C.ink3} numberOfLines={1}>{nameOf(e)}</T>}
                  {e.repeats > 0 && <T w={700} s="micro" c={C.danger}>{E.repeatsN.replace('{n}', String(e.repeats))}</T>}
                  {!e.resolved && !!e.retryOn && <T w={600} s="caption" c={C.ink3}>{E.retryOn.replace('{d}', relDay(e.retryOn, today, L, ar))}</T>}
                </View>
              </View>
              {e.resolved && <Icon name="check" size={16} color={C.successText} stroke={3} />}
            </Btn>
            {!e.resolved && (
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 12 }}>
                <View style={{ flex: 1 }}><Button variant="secondary" compact title={E.gotIt} icon="check" onPress={() => resolveErrorItem(e.id)} /></View>
                <View style={{ flex: 1 }}><Button variant="tertiary" compact title={E.missedAgain} icon="reset" onPress={() => markErrorRepeated(e.id)} /></View>
              </View>
            )}
          </View>
        ))}
        {!list.length && <View style={{ padding: 16 }}><T c={C.ink3} s="label">{E.emptyT}</T></View>}
      </Section>

      <PrimaryBtn title={E.add} icon="plus" onPress={() => router.push('/errors/new')} />
      <T w={500} s="caption" lh={1.5} c={C.ink3} style={{ paddingHorizontal: 4 }}>{E.note}</T>
    </Page>
  );
}
