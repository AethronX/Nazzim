import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Choice, Page, Section } from '../../components/Page';
import { Button, PrimaryBtn, T } from '../../components/ui';
import { isDateKey } from '../../domain/validate';
import type { AssessmentSource, AssessmentStatus } from '../../domain/types';
import { useNazzim } from '../../lib/store';
import { font, TEXT } from '../../lib/theme';

const STATUSES: AssessmentStatus[] = ['upcoming', 'inProgress', 'submitted', 'graded', 'deferred'];
const SOURCES: AssessmentSource[] = ['official', 'student', 'unconfirmed'];

// Add or edit one graded component. Everything is editable — the flexibility the student asked for: fill a
// missing weight, confirm an unconfirmed item, enter a score when it comes back. Nothing is forced.
export default function EditAssessment() {
  const { subject, id } = useLocalSearchParams<{ subject: string; id?: string }>();
  const { C, L, ar, assessments, addAssessment, updateAssessment, deleteAssessment, award } = useNazzim();
  const G = L.gr;
  const existing = id ? assessments.find(a => a.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [weight, setWeight] = useState(String(existing?.weight ?? ''));
  const [maxScore, setMaxScore] = useState(existing?.maxScore !== undefined ? String(existing.maxScore) : '');
  const [score, setScore] = useState(existing?.score !== undefined ? String(existing.score) : '');
  const [due, setDue] = useState(existing?.due ?? '');
  const [status, setStatus] = useState<AssessmentStatus>(existing?.status ?? 'upcoming');
  const [source, setSource] = useState<AssessmentSource>(existing?.source ?? 'student');
  const [confirm, setConfirm] = useState(false);

  const input = { fontFamily: font('body', 600, ar), fontSize: TEXT.body, color: C.ink, textAlign: ar ? 'right' : 'left' } as const;
  const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(/[^\d.]/g, '')));
  const w = num(weight) ?? 0;
  const validWeight = w >= 0 && w <= 100;
  const valid = name.trim().length > 0 && validWeight && (!due || isDateKey(due));

  const field = (label: string, value: string, set: (v: string) => void, opts: { ph?: string; numeric?: boolean; optional?: boolean } = {}) => (
    <View style={{ paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.line2, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <T w={700} s="micro" ls={ar ? 0 : 0.6} c={C.ink3}>{label}</T>
        {opts.optional && <T w={500} s="micro" c={C.ink3}>· {G.optional}</T>}
      </View>
      <TextInput value={value} onChangeText={set} placeholder={opts.ph} placeholderTextColor={C.ink3}
        keyboardType={opts.numeric ? 'decimal-pad' : 'default'}
        style={[input, { paddingVertical: 4 }, opts.numeric ? { fontFamily: font('body', 600, false, true) } : null]} />
    </View>
  );

  const save = () => {
    if (!valid) { award(0, G.invalidWeight); return; }
    const patch = {
      subjectId: subject!, name: name.trim(), weight: w,
      maxScore: num(maxScore), score: num(score),
      due: due.trim() || undefined, status, source,
    };
    if (existing) updateAssessment(existing.id, patch);
    else addAssessment(patch);
    router.back();
  };

  return (
    <Page title={existing ? G.edit : G.newA}>
      <Section>
        {field(G.name, name, setName, { ph: G.name })}
        {field(G.weight + ' %', weight, setWeight, { ph: '25', numeric: true })}
        {field(G.maxScore, maxScore, setMaxScore, { ph: '15', numeric: true, optional: true })}
        {field(G.score, score, setScore, { ph: '8', numeric: true, optional: true })}
        {field(G.due, due, setDue, { ph: ar ? '٢٠٢٦-١١-٠٣' : '2026-11-03', optional: true })}
      </Section>

      <View style={{ gap: 6, paddingHorizontal: 4 }}>
        <T w={700} s="micro" ls={ar ? 0 : 0.6} c={C.ink3}>{G.statusLabel}</T>
        <Choice options={STATUSES} value={status} onChange={setStatus} labels={STATUSES.map(s => G.status[s])} />
      </View>
      <View style={{ gap: 6, paddingHorizontal: 4 }}>
        <T w={700} s="micro" ls={ar ? 0 : 0.6} c={C.ink3}>{G.sourceLabel}</T>
        <Choice options={SOURCES} value={source} onChange={setSource} labels={SOURCES.map(s => G.source[s])} />
      </View>

      <PrimaryBtn title={G.save} onPress={save} disabled={!valid} />

      {existing && (
        <Button variant="destructive" icon="trash" title={confirm ? G.removeConfirm : G.remove}
          onPress={() => { if (!confirm) { setConfirm(true); return; } deleteAssessment(existing.id); router.back(); }} />
      )}
    </Page>
  );
}
