import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { SubjectTile } from '../../components/Academic';
import { Page, Section } from '../../components/Page';
import { Btn, EmptyState, T } from '../../components/ui';
import { topicStats } from '../../engine/topics';
import { useNazzim } from '../../lib/store';

// TOPICS HUB: per course, what is due for review now and how much is actually proved — kept apart from
// how much content has merely been covered.
export default function TopicsHub() {
  const { C, L, ar, today, subjects, topics } = useNazzim();
  const P = L.tp;

  const rows = useMemo(
    () => subjects.map(s => ({ s, st: topicStats(topics, today, s.id) })).filter(r => r.st.total > 0 || subjects.length <= 6),
    [subjects, topics, today],
  );

  if (!subjects.length) {
    return (
      <Page title={P.title} sub={P.sub}>
        <EmptyState icon="books" title={P.hubEmptyT} body={P.hubEmptyS}
          action={{ label: L.addSubject, onPress: () => router.push('/subject/new') }} />
      </Page>
    );
  }

  return (
    <Page title={P.title} sub={P.sub}>
      <Section>
        {rows.map(({ s, st }, i) => (
          <Btn key={s.id} pressScale={0.99} onPress={() => router.push(`/topics/${s.id}`)}
            accessibilityLabel={`${s.name}, ${P.dueN} ${st.due}, ${P.mastery} ${Math.round(st.mastery * 100)}%`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: C.line2 }}>
            <SubjectTile subject={s} size={40} />
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <T w={700} s="label" numberOfLines={1}>{s.name}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {st.due > 0 ? (
                  <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99, backgroundColor: C.warningTint }}>
                    <T w={700} s="micro" c={C.warningText}>{`${P.dueN} ${st.due}`}</T>
                  </View>
                ) : (
                  <T w={600} s="caption" c={C.ink3}>{P.caughtUpNone}</T>
                )}
                {st.total > 0 && <T w={600} s="caption" c={C.ink3}>{`${P.mastered} ${st.mastered}/${st.total}`}</T>}
              </View>
            </View>
            <View style={{ alignItems: 'center' }}>
              <T num="data" w={800} s="heading" c={C.ink}>{st.total ? `${Math.round(st.mastery * 100)}%` : '—'}</T>
              <T w={600} s="micro" c={C.ink3}>{P.mastery}</T>
            </View>
          </Btn>
        ))}
      </Section>
      <T w={500} s="caption" lh={1.5} c={C.ink3} style={{ textAlign: ar ? 'right' : 'left', paddingHorizontal: 4 }}>{P.note}</T>
    </Page>
  );
}
