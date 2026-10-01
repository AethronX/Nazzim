import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { SubjectPicker } from '../../components/Academic';
import { Choice, Page, Section } from '../../components/Page';
import { Btn, T } from '../../components/ui';
import { addDays } from '../../lib/exams';
import { fmtDate } from '../../lib/format';
import { useNazzim } from '../../lib/store';
import { font } from '../../lib/theme';

const DUE_IN = [0, 1, 2, 7];
const ESTIMATES = [15, 30, 45, 60, 90];

// Add a task: what, for which subject, when it is due and roughly how long it takes.
export default function NewTask() {
  const { subject: preset } = useLocalSearchParams<{ subject?: string }>();
  const { C, L, ar, accent, today, addTask } = useNazzim();
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string | undefined>(preset);
  const [dueIn, setDueIn] = useState(1);
  const [estimate, setEstimate] = useState(45);
  const ok = title.trim().length > 0;
  const dueLabels = DUE_IN.map(n => (n === 0 ? L.dToday : n === 1 ? L.dTomorrow : L.dIn.replace('{n}', String(n))));

  const create = () => {
    if (!ok) return;
    addTask({ title: title.trim(), subjectId, due: addDays(today, dueIn), estimateMin: estimate });
    router.back();
  };

  return (
    <Page title={L.addTask}>
      <Section>
        <TextInput value={title} onChangeText={setTitle} placeholder={L.taskTitlePh} placeholderTextColor={C.ink3} autoFocus returnKeyType="done" onSubmitEditing={create}
          style={{ fontFamily: font('body', 600, ar), fontSize: 16, color: C.ink, paddingVertical: 16, paddingHorizontal: 16, textAlign: ar ? 'right' : 'left' }} />
      </Section>
      <Section label={L.examFor}>
        <View style={{ padding: 14 }}><SubjectPicker value={subjectId} onChange={setSubjectId} allowNone /></View>
      </Section>
      <Section label={L.due}>
        <View style={{ padding: 14, gap: 8 }}>
          <Choice options={DUE_IN} value={dueIn} onChange={setDueIn} labels={dueLabels} />
          <T w={600} s="caption" c={C.ink3}>{fmtDate(addDays(today, dueIn), L)}</T>
        </View>
      </Section>
      <Section label={L.estimate}>
        <View style={{ padding: 14 }}>
          <Choice options={ESTIMATES} value={estimate} onChange={setEstimate} labels={ESTIMATES.map(m => `${m} ${L.min}`)} />
        </View>
      </Section>
      <Btn onPress={create} disabled={!ok} pressedBg={accent.strong}
        style={{ padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: ok ? accent.a1 : C.line2, boxShadow: ok ? accent.glow : undefined }}>
        <T w={800} s="body" c={ok ? C.onAccent : C.ink3}>{L.create}</T>
      </Btn>
    </Page>
  );
}
