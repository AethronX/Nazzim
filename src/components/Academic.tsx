import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { Subject, SubjectColor, SubjectIcon } from '../domain/types';
import { useNazzim } from '../lib/store';
import { swatch } from '../lib/theme';
import { Btn, Icon, Pct, T } from './ui';

export const SUBJECT_ICONS: SubjectIcon[] = ['chart', 'function', 'atom', 'code', 'book', 'flask', 'globe', 'pen'];
export const SUBJECT_COLOR_KEYS: SubjectColor[] = ['indigo', 'green', 'amber', 'sky', 'rose', 'teal', 'violet'];
export const GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'];

// Rounded tile with the subject's icon on its soft colour.
export function SubjectTile({ subject, size = 40 }: { subject?: Pick<Subject, 'color' | 'icon'>; size?: number }) {
  const { C, scheme } = useNazzim();
  if (!subject) {
    return <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: C.line2, alignItems: 'center', justifyContent: 'center' }}><Icon name="book" size={size * 0.48} color={C.ink3} /></View>;
  }
  const sw = swatch(subject.color, scheme);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: sw.tint, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={subject.icon} size={size * 0.5} color={sw.fg} stroke={2} />
    </View>
  );
}

// Thin ring with the value in the middle (subject cards, semester progress).
export function ProgressRing({ value, size = 44, stroke = 4, color, label }: { value: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const { C, accent } = useNazzim();
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`${v}%`}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.line} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color ?? accent.fg} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - v / 100)} />
      </Svg>
      {label !== '' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          {label === undefined ? <Pct value={v} size={Math.round(size * 0.26)} /> : <T f="grotesk" w={700} s={size * 0.26} c={C.ink}>{label}</T>}
        </View>
      )}
    </View>
  );
}

// Thin linear bar used across Today, Subjects and Exams.
export function Bar({ value, color, height = 6 }: { value: number; color?: string; height?: number }) {
  const { accent } = useNazzim();
  return (
    <View style={{ height, borderRadius: 99, backgroundColor: accent.tint, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', borderRadius: 99, backgroundColor: color ?? accent.fg }} />
    </View>
  );
}

// Horizontal pills to pick a subject (or none).
export function SubjectPicker({ value, onChange, allowNone }: { value?: string; onChange: (id?: string) => void; allowNone?: boolean }) {
  const { C, accent, subjects, L } = useNazzim();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
      {subjects.map(s => {
        const on = value === s.id;
        return (
          <Btn key={s.id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(s.id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingStart: 6, paddingEnd: 12, borderRadius: 99, borderWidth: 1.5, borderColor: on ? accent.a1 : C.line, backgroundColor: on ? accent.tint : C.card }}>
            <SubjectTile subject={s} size={24} />
            <T w={700} s={13} c={on ? accent.strong : C.ink}>{s.name}</T>
          </Btn>
        );
      })}
      {allowNone && (
        <Btn accessibilityRole="radio" accessibilityState={{ checked: !value }} onPress={() => onChange(undefined)}
          style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1.5, borderColor: !value ? accent.a1 : C.line, backgroundColor: !value ? accent.tint : C.card }}>
          <T w={700} s={13} c={!value ? accent.strong : C.ink3}>—</T>
        </Btn>
      )}
      {!subjects.length && <T w={600} s={12.5} c={C.ink3}>{L.noSubjects}</T>}
    </View>
  );
}

// Small type badge used in agendas: Study / Task / Exam.
export function KindBadge({ kind }: { kind: 'session' | 'task' | 'exam' }) {
  const { C, L, accent } = useNazzim();
  const map = {
    session: { label: L.kStudyB, bg: accent.tint, fg: accent.strong },
    task: { label: L.kTaskB, bg: C.successTint, fg: C.successText },
    exam: { label: L.kExam, bg: C.warningTint, fg: C.warningText },
  }[kind];
  return (
    <View style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99, backgroundColor: map.bg }}>
      <T w={700} s={10.5} c={map.fg}>{map.label}</T>
    </View>
  );
}
