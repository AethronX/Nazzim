import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { GRADES, SUBJECT_COLOR_KEYS, SUBJECT_ICONS, SubjectTile } from '../../components/Academic';
import { Page, Section } from '../../components/Page';
import { Btn, Icon, T } from '../../components/ui';
import type { SubjectColor, SubjectIcon } from '../../domain/types';
import { useNazzim } from '../../lib/store';
import { font, swatch } from '../../lib/theme';

// Add a subject: name, target grade, colour and icon. Four quick choices, nothing else.
export default function NewSubject() {
  const { C, L, ar, accent, scheme, subjects, addSubject } = useNazzim();
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('A');
  const [color, setColor] = useState<SubjectColor>(SUBJECT_COLOR_KEYS[subjects.length % SUBJECT_COLOR_KEYS.length]);
  const [icon, setIcon] = useState<SubjectIcon>('book');
  const ok = name.trim().length > 0;

  const create = () => {
    if (!ok) return;
    const id = addSubject({ name: name.trim(), targetGrade: grade, color, icon });
    router.replace(`/subject/${id}`);
  };

  return (
    <Page title={L.newSubject}>
      <View style={{ alignItems: 'center', paddingVertical: 6 }}>
        <SubjectTile subject={{ color, icon }} size={64} />
      </View>
      <Section>
        <View style={{ paddingVertical: 12, paddingHorizontal: 16, gap: 2 }}>
          <T w={700} s="micro" c={C.ink3}>{L.subjName}</T>
          <TextInput value={name} onChangeText={setName} placeholder={L.subjNamePh} placeholderTextColor={C.ink3} autoFocus autoCapitalize="words"
            returnKeyType="done" onSubmitEditing={create}
            style={{ fontFamily: font('body', 600, ar), fontSize: 16, color: C.ink, paddingVertical: 4, textAlign: ar ? 'right' : 'left' }} />
        </View>
      </Section>

      <Section label={L.targetGrade}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 }} accessibilityRole="radiogroup">
          {GRADES.map(g => {
            const on = g === grade;
            return (
              <Btn key={g} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setGrade(g)}
                style={{ minWidth: 48, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: on ? accent.a1 : C.line, backgroundColor: on ? accent.tint : C.card }}>
                <T ltr w={700} s="label" c={on ? accent.strong : C.ink2}>{g}</T>
              </Btn>
            );
          })}
        </View>
      </Section>

      <Section label={L.colour}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 14 }} accessibilityRole="radiogroup">
          {SUBJECT_COLOR_KEYS.map(k => {
            const on = k === color, sw = swatch(k, scheme);
            return (
              <Btn key={k} accessibilityRole="radio" accessibilityLabel={k} accessibilityState={{ checked: on }} onPress={() => setColor(k)} pressScale={0.9}
                style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? sw.fg : 'transparent' }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: sw.fg }} />
              </Btn>
            );
          })}
        </View>
      </Section>

      <Section label={L.icon}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14 }} accessibilityRole="radiogroup">
          {SUBJECT_ICONS.map(ic => {
            const on = ic === icon, sw = swatch(color, scheme);
            return (
              <Btn key={ic} accessibilityRole="radio" accessibilityLabel={ic} accessibilityState={{ checked: on }} onPress={() => setIcon(ic)} pressScale={0.9}
                style={{ width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? sw.tint : C.card2, borderWidth: 1.5, borderColor: on ? sw.fg : C.line }}>
                <Icon name={ic} size={22} color={on ? sw.fg : C.ink3} stroke={2} />
              </Btn>
            );
          })}
        </View>
      </Section>

      <Btn onPress={create} disabled={!ok} pressedBg={accent.strong}
        style={{ padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: ok ? accent.a1 : C.line2, boxShadow: ok ? accent.glow : undefined }}>
        <T w={800} s="body" c={ok ? C.onAccent : C.ink3}>{L.create}</T>
      </Btn>
    </Page>
  );
}
