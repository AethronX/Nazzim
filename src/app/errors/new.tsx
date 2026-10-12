import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Choice, Page, Section } from '../../components/Page';
import { Button, PrimaryBtn, T } from '../../components/ui';
import { ERROR_KINDS } from '../../engine/errors';
import type { ErrorKind } from '../../domain/types';
import { useNazzim } from '../../lib/store';
import { font, TEXT } from '../../lib/theme';

// Log or edit one mistake. Only the question and its type are required — a mistake logged in ten seconds is
// worth more than a perfect record never written down.
export default function NewError() {
  const { id, subject: subjectParam } = useLocalSearchParams<{ id?: string; subject?: string }>();
  const { C, L, ar, subjects, errors, addError, updateError, deleteError } = useNazzim();
  const E = L.er;
  const existing = id ? errors.find(e => e.id === id) : undefined;

  const [subjectId, setSubjectId] = useState(existing?.subjectId ?? subjectParam ?? subjects[0]?.id ?? '');
  const [question, setQuestion] = useState(existing?.question ?? '');
  const [myAnswer, setMyAnswer] = useState(existing?.myAnswer ?? '');
  const [correctAnswer, setCorrect] = useState(existing?.correctAnswer ?? '');
  const [kind, setKind] = useState<ErrorKind>(existing?.kind ?? 'concept');
  const [cause, setCause] = useState(existing?.cause ?? '');
  const [fix, setFix] = useState(existing?.fix ?? '');
  const [confirm, setConfirm] = useState(false);

  const input = { fontFamily: font('body', 600, ar), fontSize: TEXT.body, color: C.ink, textAlign: ar ? 'right' : 'left' } as const;
  const valid = question.trim().length > 0 && !!subjectId;

  const field = (label: string, value: string, set: (v: string) => void, opts: { multiline?: boolean; optional?: boolean; last?: boolean } = {}) => (
    <View style={{ paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: opts.last ? 0 : 1, borderBottomColor: C.line2, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <T w={700} s="micro" ls={ar ? 0 : 0.6} c={C.ink3}>{label}</T>
        {opts.optional && <T w={500} s="micro" c={C.ink3}>· {E.optional}</T>}
      </View>
      <TextInput value={value} onChangeText={set} placeholder={label} placeholderTextColor={C.ink3}
        multiline={opts.multiline} textAlignVertical={opts.multiline ? 'top' : 'center'} accessibilityLabel={label}
        style={[input, { paddingVertical: 4 }, opts.multiline ? { minHeight: 64, lineHeight: 23 } : null]} />
    </View>
  );

  const save = () => {
    if (!valid) return;
    const patch = {
      subjectId, question: question.trim(), kind,
      myAnswer: myAnswer.trim() || undefined,
      correctAnswer: correctAnswer.trim() || undefined,
      cause: cause.trim() || undefined,
      fix: fix.trim() || undefined,
    };
    if (existing) updateError(existing.id, patch);
    else addError(patch);
    router.back();
  };

  return (
    <Page title={existing ? E.edit : E.newE}>
      {subjects.length > 1 && (
        <View style={{ gap: 6, paddingHorizontal: 4 }}>
          <T w={700} s="micro" ls={ar ? 0 : 0.6} c={C.ink3}>{E.subjectLabel}</T>
          <Choice options={subjects.map(s => s.id)} value={subjectId} onChange={setSubjectId}
            labels={subjects.map(s => s.name.split('—')[0].trim())} />
        </View>
      )}

      <Section>
        {field(E.question, question, setQuestion, { multiline: true })}
        {field(E.myAnswer, myAnswer, setMyAnswer, { optional: true })}
        {field(E.correctAnswer, correctAnswer, setCorrect, { multiline: true, optional: true, last: true })}
      </Section>

      <View style={{ gap: 6, paddingHorizontal: 4 }}>
        <T w={700} s="micro" ls={ar ? 0 : 0.6} c={C.ink3}>{E.kindLabel}</T>
        <Choice options={ERROR_KINDS} value={kind} onChange={setKind} labels={ERROR_KINDS.map(k => E.kinds[k])} />
      </View>

      <Section>
        {field(E.cause, cause, setCause, { optional: true })}
        {field(E.fix, fix, setFix, { optional: true, last: true })}
      </Section>

      <PrimaryBtn title={E.save} onPress={save} disabled={!valid} />
      {existing && (
        <Button variant="destructive" icon="trash" title={confirm ? E.removeConfirm : E.remove}
          onPress={() => { if (!confirm) { setConfirm(true); return; } deleteError(existing.id); router.back(); }} />
      )}
    </Page>
  );
}
