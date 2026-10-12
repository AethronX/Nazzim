import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Page, Section } from '../../components/Page';
import { Btn, Button, Card, Icon, T } from '../../components/ui';
import { dueTopics, mastery, topicStats } from '../../engine/topics';
import type { Topic } from '../../domain/types';
import { relDay } from '../../lib/format';
import { useNazzim } from '../../lib/store';
import { font, TEXT } from '../../lib/theme';

// SUBJECT TOPICS: the review queue first, then the full map. Rating a topic is one tap and immediately
// reschedules it — the whole loop lives on this screen so reviewing never costs navigation.
export default function SubjectTopics() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { C, L, ar, today, subjects, topics, addTopic, reviewTopic, deleteTopic } = useNazzim();
  const P = L.tp;
  const subject = subjects.find(s => s.id === id);
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const mine = useMemo(() => topics.filter(t => t.subjectId === id), [topics, id]);
  const due = useMemo(() => dueTopics(mine, today, id), [mine, today, id]);
  const st = useMemo(() => topicStats(mine, today, id), [mine, today, id]);
  const nextUp = useMemo(() => mine.filter(t => t.nextReview && t.nextReview > today).sort((a, b) => a.nextReview!.localeCompare(b.nextReview!))[0], [mine, today]);

  if (!subject) return <Page title={P.title}><T c={C.ink3}>{L.exNone}</T></Page>;

  const add = () => { if (draft.trim()) { addTopic(id!, draft); setDraft(''); } };

  const row = (t: Topic, last: boolean, showGrades: boolean) => {
    const m = mastery(t);
    const expanded = open === t.id;
    const tone = m === undefined ? C.ink3 : m >= 0.8 ? C.successText : m >= 0.5 ? C.warningText : C.danger;
    return (
      <View key={t.id} style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line2 }}>
        <Btn pressScale={0.99} onPress={() => setOpen(expanded ? null : t.id)}
          accessibilityLabel={`${t.name}, ${P.status[t.status]}`} accessibilityState={{ expanded }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: tone }} />
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <T w={700} s="label" numberOfLines={2}>{t.name}</T>
            <T w={600} s="caption" c={C.ink3}>
              {t.nextReview ? P.next.replace('{d}', relDay(t.nextReview, today, L, ar)) : P.never}
              {t.correct + t.wrong > 0 ? ` · ${P.attempts.replace('{c}', String(t.correct)).replace('{w}', String(t.wrong))}` : ''}
            </T>
          </View>
          {m !== undefined && <T num="data" w={800} s="label" c={tone}>{`${Math.round(m * 100)}%`}</T>}
        </Btn>

        {(expanded || showGrades) && (
          <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 8 }}>
            <T w={500} s="caption" c={C.ink2}>{P.prompt}</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([0, 1, 2] as const).map(g => {
                const look = [{ bg: C.dangerTint, fg: C.danger }, { bg: C.warningTint, fg: C.warningText }, { bg: C.successTint, fg: C.successText }][g];
                return (
                  <Btn key={g} onPress={() => { reviewTopic(t.id, g); setOpen(null); }} pressScale={0.96} label={P.grades[g]}
                    style={{ flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <T w={700} s="label" c={look.fg}>{P.grades[g]}</T>
                  </Btn>
                );
              })}
            </View>
            {expanded && (
              <Btn onPress={() => { if (confirm === t.id) { deleteTopic(t.id); setConfirm(null); } else setConfirm(t.id); }}
                label={confirm === t.id ? P.removeConfirm : P.remove}
                style={{ alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center', paddingHorizontal: 8 }}>
                <T w={700} s="caption" c={C.danger}>{confirm === t.id ? P.removeConfirm : P.remove}</T>
              </Btn>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Page title={subject.name} sub={P.title}>
      {/* Coverage and proved mastery, deliberately shown as two different numbers. */}
      <Card tone="hero" pad={18}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([[P.coverage, `${Math.round(st.coverage * 100)}%`], [P.mastery, st.total ? `${Math.round(st.mastery * 100)}%` : '—'], [P.mastered, `${st.mastered}/${st.total}`]] as const).map(([label, value]) => (
            <View key={label} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <T num="data" w={800} s="title" ls={-0.5}>{value}</T>
              <T w={600} s="micro" c={C.ink3} numberOfLines={1}>{label}</T>
            </View>
          ))}
        </View>
      </Card>

      {/* Review queue */}
      <Section label={`${P.due} · ${due.length}`}>
        {due.length ? due.map((t, i) => row(t, i === due.length - 1, true)) : (
          <View style={{ flexDirection: 'row', gap: 10, padding: 16, alignItems: 'center' }}>
            <Icon name="check" size={17} color={C.successText} stroke={2.6} />
            <T w={600} s="label" c={C.ink2} style={{ flex: 1 }}>
              {nextUp?.nextReview ? P.caughtUp.replace('{d}', relDay(nextUp.nextReview, today, L, ar)) : P.caughtUpNone}
            </T>
          </View>
        )}
      </Section>

      {/* Add + full map */}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingHorizontal: 14 }}>
          <TextInput value={draft} onChangeText={setDraft} placeholder={P.addPh} placeholderTextColor={C.ink3}
            onSubmitEditing={add} returnKeyType="done" accessibilityLabel={P.add}
            style={{ fontFamily: font('body', 600, ar), fontSize: TEXT.body, color: C.ink, paddingVertical: 14, textAlign: ar ? 'right' : 'left' }} />
        </View>
        <Button title={P.add} icon="plus" onPress={add} disabled={!draft.trim()} compact />
      </View>

      {mine.length > 0 && (
        <Section label={`${P.allTopics} · ${mine.length}`}>
          {mine.map((t, i) => row(t, i === mine.length - 1, false))}
        </Section>
      )}

      <T w={500} s="caption" lh={1.5} c={C.ink3} style={{ paddingHorizontal: 4 }}>{P.note}</T>
    </Page>
  );
}
