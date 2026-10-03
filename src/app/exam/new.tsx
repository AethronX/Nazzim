import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { SubjectPicker } from '../../components/Academic';
import { Page, Section } from '../../components/Page';
import { Btn, Icon, PrimaryBtn, T } from '../../components/ui';
import { addDays, planExam } from '../../lib/exams';
import { fmtDate, inDays as inDaysLabel, relDay } from '../../lib/format';
import { useNazzim } from '../../lib/store';
import { font, TEXT } from '../../lib/theme';

const QUICK_DAYS = [3, 7, 14, 21];

export default function NewExam() {
  const { subject: preset } = useLocalSearchParams<{ subject?: string }>();
  const { C, L, ar, accent, today, addExam, subjects, atExamLimit, hitLimit } = useNazzim();
  // Pick an existing subject, or type a new name (a subject is created for it).
  const [subjectId, setSubjectId] = useState<string | undefined>(preset ?? subjects[0]?.id);
  const [typed, setTyped] = useState('');
  const picked = subjects.find(s => s.id === subjectId);
  const subject = picked ? picked.name : typed;
  const [inDays, setInDays] = useState(7);
  const [chaptersText, setChaptersText] = useState('');
  const date = addDays(today, inDays);
  const chapters = chaptersText.split('\n').map(c => c.trim()).filter(Boolean);
  // Live preview of what the engine will build.
  const preview = planExam({ id: 'preview', subject, date, chapters }, today);
  const canCreate = subject.trim().length > 0 && chapters.length > 0 && inDays >= 1;
  const input = { fontFamily: font('body', 600, ar), fontSize: TEXT.body, color: C.ink, paddingVertical: 4, textAlign: ar ? 'right' : 'left' } as const;

  const create = () => {
    if (!canCreate) return;
    if (atExamLimit) { hitLimit(); return; }
    const id = addExam({ subject: subject.trim(), subjectId: picked?.id, date, chapters });
    router.replace(`/exam/${id}`);
  };

  return (
    <Page title={L.exNew}>
      <Section>
        <View style={{ paddingVertical: 12, paddingHorizontal: 16, gap: 2 }}>
          <T w={700} s="micro" ls={ar ? 0 : 0.6} c={C.ink3}>{L.exSubject}</T>
          {!!subjects.length && <View style={{ paddingVertical: 8 }}><SubjectPicker value={subjectId} onChange={setSubjectId} allowNone /></View>}
          {!picked && <TextInput value={typed} onChangeText={setTyped} placeholder={L.exSubjectPh} placeholderTextColor={C.ink3} autoCapitalize="words" returnKeyType="next" style={input} />}
        </View>
      </Section>

      <Section label={L.exDate}>
        <View style={{ padding: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Btn label="−1" onPress={() => setInDays(n => Math.max(1, n - 1))} style={stepper(C.line)}>
              <T ltr w={700} s="title" c={C.ink2}>−</T>
            </Btn>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <T f="display" w={700} s="title" ls={ar ? 0 : -0.4}>{fmtDate(date, L)}</T>
              <T w={600} s="caption" c={accent.fg} style={{ marginTop: 2 }}>{relDay(date, today, L, ar)}</T>
            </View>
            <Btn label="+1" onPress={() => setInDays(n => Math.min(120, n + 1))} style={stepper(C.line)}>
              <T ltr w={700} s="title" c={C.ink2}>+</T>
            </Btn>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }} accessibilityRole="radiogroup">
            {QUICK_DAYS.map(n => {
              const on = inDays === n;
              return (
                <Btn key={n} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setInDays(n)}
                  style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: on ? accent.tint : 'transparent', borderWidth: 1, borderColor: on ? accent.tint : C.line }}>
                  <T w={700} s="caption" c={on ? accent.strong : C.ink3}>{inDaysLabel(n, L, ar)}</T>
                </Btn>
              );
            })}
          </View>
        </View>
      </Section>

      <Section label={L.exChapters}>
        <TextInput
          value={chaptersText} onChangeText={setChaptersText} placeholder={L.exChaptersPh} placeholderTextColor={C.ink3}
          multiline textAlignVertical="top"
          style={[input, { minHeight: 120, paddingVertical: 14, paddingHorizontal: 16, lineHeight: 24 }]}
        />
      </Section>

      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 4, alignItems: 'flex-start' }}>
        <Icon name="sparkle" size={15} color={accent.fg} stroke={2.1} />
        <T w={600} s="caption" lh={1.5} c={C.ink2} style={{ flex: 1 }}>
          {chapters.length === 0 ? L.exNeedsChapters : L.exPreview.replace('{s}', String(preview.length)).replace('{d}', String(inDays))}
        </T>
      </View>

      <PrimaryBtn title={L.exCreate} onPress={create} disabled={!canCreate} />
    </Page>
  );
}

const stepper = (border: string) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }) as const;
