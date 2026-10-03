import { useMemo, useState, type ReactNode } from 'react';
import { TextInput, View } from 'react-native';
import { SubjectPicker } from './Academic';
import { Choice, Section } from './Page';
import { Btn, PrimaryBtn, T } from './ui';
import type { TaskPriority } from '../domain/types';
import { isDateKey } from '../domain/validate';
import { parseQuickTask } from '../engine/tasks';
import { addDays, daysBetween } from '../lib/exams';
import { fmtDate, inDays, relDay } from '../lib/format';
import { useNazzim } from '../lib/store';
import { font, TEXT } from '../lib/theme';

export type TaskDraft = {
  title: string; subjectId?: string; due: string; estimateMin: number; priority: TaskPriority; notes: string;
};

const QUICK_DUE = [0, 1, 2, 7];
const ESTIMATES = [15, 30, 45, 60, 90];
const PRIORITIES: TaskPriority[] = ['low', 'normal', 'high'];

// One form for adding and editing a task, so the two can never drift apart.
//
// `smart` turns the title into a one-line entry: "مقال الإحصاء غداً 45 د" fills the date, the time and the
// subject as you type. A field the student sets by hand is never overwritten by what the parser reads
// afterwards — the parser proposes, the student decides.
export function TaskForm({ initial, smart, submitLabel, onSubmit, children }: {
  initial: TaskDraft; smart?: boolean; submitLabel: string;
  onSubmit: (d: TaskDraft) => void; children?: ReactNode;
}) {
  const { C, L, ar, accent, today, subjects } = useNazzim();
  const [raw, setRaw] = useState(initial.title);
  const [subjectId, setSubjectId] = useState(initial.subjectId);
  const [dueIn, setDueIn] = useState(() => {
    const d = daysBetween(today, initial.due);
    return Number.isFinite(d) ? d : 1;
  });
  const [estimate, setEstimate] = useState(initial.estimateMin);
  const [priority, setPriority] = useState<TaskPriority>(initial.priority);
  const [notes, setNotes] = useState(initial.notes);
  // Which fields the student set by hand. Those stop following the parser.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (k: string) => setTouched(t => (t[k] ? t : { ...t, [k]: true }));

  const parsed = useMemo(() => (smart ? parseQuickTask(raw, today, subjects) : null), [smart, raw, today, subjects]);
  // What the form will actually save: the parser's reading wherever the student has not overridden it.
  const eff = {
    dueIn: parsed?.dueIn !== undefined && !touched.due ? parsed.dueIn : dueIn,
    estimate: parsed?.estimateMin !== undefined && !touched.estimate ? parsed.estimateMin : estimate,
    subjectId: parsed?.subjectId !== undefined && !touched.subject ? parsed.subjectId : subjectId,
    priority: parsed?.priority !== undefined && !touched.priority ? parsed.priority : priority,
  };
  const title = (smart && parsed ? parsed.title : raw).trim();
  const due = addDays(today, eff.dueIn);
  const valid = title.length > 0 && isDateKey(due);
  // The earliest day the stepper allows: today, or the task's own past date when editing an overdue one.
  const minDue = Math.min(0, daysBetween(today, initial.due) || 0);

  const understood = parsed ? [
    parsed.dueIn !== undefined ? relDay(addDays(today, parsed.dueIn), today, L, ar) : null,
    parsed.estimateMin !== undefined ? `${parsed.estimateMin} ${L.min}` : null,
    parsed.subjectId ? subjects.find(s => s.id === parsed.subjectId)?.name : null,
    parsed.priority === 'high' ? L.tkPriorities[2] : parsed.priority === 'low' ? L.tkPriorities[0] : null,
  ].filter(Boolean) as string[] : [];

  const input = { fontFamily: font('body', 600, ar), color: C.ink, textAlign: ar ? 'right' : 'left' } as const;
  const submit = () => {
    if (!valid) return;
    onSubmit({ title, subjectId: eff.subjectId, due, estimateMin: eff.estimate, priority: eff.priority, notes: notes.trim() });
  };

  return (
    <>
      <Section label={smart ? undefined : L.tkTitleL}>
        <TextInput value={raw} onChangeText={setRaw} placeholder={smart ? L.tkQuickPh : L.taskTitlePh} placeholderTextColor={C.ink3}
          autoFocus={smart} returnKeyType="done" onSubmitEditing={submit} accessibilityLabel={L.tkTitleL}
          style={[input, { fontSize: 16, paddingVertical: 16, paddingHorizontal: 16 }]} />
        {!!understood.length && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingBottom: 14 }}>
            <T w={700} s="caption" c={C.ink3}>{L.tkUnderstood}</T>
            {understood.map(u => (
              <View key={u} style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99, backgroundColor: accent.tint }}>
                <T w={700} s="caption" c={accent.strong}>{u}</T>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section label={L.examFor}>
        <View style={{ padding: 14 }}>
          <SubjectPicker value={eff.subjectId} onChange={v => { touch('subject'); setSubjectId(v); }} allowNone />
        </View>
      </Section>

      <Section label={L.tkDueDate}>
        <View style={{ padding: 14, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Btn label={L.tkDayEarlier} onPress={() => { touch('due'); setDueIn(Math.max(minDue, eff.dueIn - 1)); }} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
              <T ltr w={700} s="title" c={C.ink2}>−</T>
            </Btn>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <T f="display" w={700} s="heading">{fmtDate(due, L)}</T>
              <T w={600} s="caption" c={eff.dueIn < 0 ? C.warningText : accent.fg} style={{ marginTop: 2 }}>
                {eff.dueIn === -1 ? L.rOverdue1 : eff.dueIn < 0 ? L.rOverdue.replace('{n}', String(-eff.dueIn)) : relDay(due, today, L, ar)}
              </T>
            </View>
            <Btn label={L.tkDayLater} onPress={() => { touch('due'); setDueIn(Math.min(365, eff.dueIn + 1)); }} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
              <T ltr w={700} s="title" c={C.ink2}>+</T>
            </Btn>
          </View>
          <Choice options={QUICK_DUE} value={eff.dueIn} onChange={v => { touch('due'); setDueIn(v); }}
            labels={QUICK_DUE.map(n => inDays(n, L, ar))} />
        </View>
      </Section>

      <Section label={L.estimate}>
        <View style={{ padding: 14, gap: 12 }}>
          <Choice options={ESTIMATES} value={eff.estimate} onChange={v => { touch('estimate'); setEstimate(v); }} labels={ESTIMATES.map(m => `${m} ${L.min}`)} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <Btn label={L.tkMinusMin} onPress={() => { touch('estimate'); setEstimate(Math.max(5, eff.estimate - 5)); }}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: C.line }}>
              <T w={700} s="label" c={C.ink2}>{L.tkMinusMin}</T>
            </Btn>
            <T w={700} s="body" style={{ minWidth: 70, textAlign: 'center' }}>{`${eff.estimate} ${L.min}`}</T>
            <Btn label={L.tkPlusMin} onPress={() => { touch('estimate'); setEstimate(Math.min(600, eff.estimate + 5)); }}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: C.line }}>
              <T w={700} s="label" c={C.ink2}>{L.tkPlusMin}</T>
            </Btn>
          </View>
        </View>
      </Section>

      <Section label={L.tkPriority}>
        <View style={{ padding: 14 }}>
          <Choice options={PRIORITIES} value={eff.priority} onChange={v => { touch('priority'); setPriority(v); }} labels={L.tkPriorities} />
        </View>
      </Section>

      <Section label={L.tkNotes}>
        <TextInput value={notes} onChangeText={setNotes} placeholder={L.tkNotesPh} placeholderTextColor={C.ink3} multiline textAlignVertical="top"
          accessibilityLabel={L.tkNotes} style={[input, { fontSize: TEXT.body, minHeight: 84, padding: 16, lineHeight: 23 }]} />
      </Section>

      <PrimaryBtn title={submitLabel} onPress={submit} disabled={!valid} />
      {children}
    </>
  );
}
