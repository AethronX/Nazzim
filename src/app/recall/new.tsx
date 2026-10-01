import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Choice, Page, Section } from '../../components/Page';
import { PrimaryBtn, T } from '../../components/ui';
import { useNazzim } from '../../lib/store';
import { font } from '../../lib/theme';

// Writing a card is itself a study step (generation effect), so this screen stays out of the way:
// pick the chapter, ask the question, write the key. Nothing is generated for the student.
export default function NewCard() {
  const { exam: examId } = useLocalSearchParams<{ exam: string }>();
  const { C, L, ar, exams, addCard } = useNazzim();
  const exam = exams.find(e => e.id === examId);
  const [chapter, setChapter] = useState(0);
  const [q, setQ] = useState('');
  const [a, setA] = useState('');

  if (!exam) return <Page title={L.rcAdd}><T c={C.ink3}>{L.exNone}</T></Page>;

  const input = { fontFamily: font('body', 600, ar), fontSize: 15, color: C.ink, textAlign: ar ? 'right' : 'left' } as const;
  const ready = q.trim().length > 2 && a.trim().length > 1;

  const save = () => {
    if (!ready) return;
    addCard(exam.id, chapter, q, a);
    router.back();
  };

  return (
    <Page title={L.rcAdd} sub={exam.subject}>
      {exam.chapters.length > 1 && (
        <Section label={L.rcChapter}>
          <View style={{ padding: 12 }}>
            <Choice options={exam.chapters.map((_, i) => i)} value={chapter} onChange={setChapter} labels={exam.chapters} />
          </View>
        </Section>
      )}

      <Section label={L.rcQ}>
        <TextInput value={q} onChangeText={setQ} placeholder={L.rcQPh} placeholderTextColor={C.ink3}
          multiline textAlignVertical="top" autoFocus style={[input, { minHeight: 80, padding: 16, lineHeight: 23 }]} />
      </Section>

      <Section label={L.rcA}>
        <TextInput value={a} onChangeText={setA} placeholder={L.rcAPh} placeholderTextColor={C.ink3}
          multiline textAlignVertical="top" style={[input, { minHeight: 120, padding: 16, lineHeight: 23 }]} />
      </Section>

      <PrimaryBtn title={L.rcSave} onPress={save} disabled={!ready} />
    </Page>
  );
}
