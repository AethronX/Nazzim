import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GRADES } from '../components/Academic';
import { LogoMark } from '../components/Logo';
import { Choice } from '../components/Page';
import { Btn, Icon, PrimaryBtn, T } from '../components/ui';
import type { StudyTime } from '../engine/habits';
import { useNazzim, type Onboarding } from '../lib/store';
import { font } from '../lib/theme';

const IN_DAYS = [3, 7, 14, 21, 30];

// First run: the minimum Nazzim needs (where you study, your subjects, your next exam), then the semester is built.
// Everything else is learned progressively. One primary action per step; every step can be skipped.
export default function Welcome() {
  const { C, L, ar, accent, lang, set, onboard, loadSample } = useNazzim();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ name: '', uni: '', major: '' });
  const [subjects, setSubjects] = useState<Onboarding['subjects']>([]);
  const [draft, setDraft] = useState('');
  const [examSubject, setExamSubject] = useState<number | null>(0);
  const [inDays, setInDays] = useState(7);
  const [chapters, setChapters] = useState(4);
  const [studyTime, setStudyTime] = useState<StudyTime>('afternoon');
  const input = { fontFamily: font('body', 600, ar), fontSize: 15.5, color: C.ink, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, textAlign: ar ? 'right' : 'left' } as const;

  const addSubject = () => {
    const name = draft.trim();
    if (!name || subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) return;
    setSubjects(s => [...s, { name, targetGrade: 'A' }]);
    setDraft('');
  };
  const finish = () => {
    onboard({ profile, subjects, studyTime, exam: examSubject !== null && subjects.length ? { subject: examSubject, inDays, chapters } : undefined });
    router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, direction: ar ? 'rtl' : 'ltr' }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24, paddingHorizontal: 22, gap: 16 }}>
        {step === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', gap: 28 }}>
            <View style={{ alignItems: 'center', gap: 16 }}>
              <LogoMark width={72} bowl={accent.a1} dot={accent.a1} />
              <T f="display" w={700} s={34} ls={ar ? 0 : -1}>{L.appName}</T>
              <T w={600} s={17} lh={1.45} c={C.ink2} style={{ textAlign: 'center', maxWidth: 300 }}>{L.obTag}</T>
            </View>
            <View style={{ gap: 10 }}>
              <PrimaryBtn title={L.obStart} onPress={() => setStep(1)} />
              <Btn onPress={() => { loadSample(); router.replace('/'); }} style={{ padding: 14, borderRadius: 16, alignItems: 'center' }}>
                <T w={700} s={14} c={accent.fg}>{L.obSample}</T>
              </Btn>
              <Btn onPress={() => router.push('/account')} style={{ padding: 10, alignItems: 'center' }}>
                <T w={700} s={13.5} c={C.ink2}>{L.obHaveAccount}</T>
              </Btn>
              <View style={{ alignItems: 'center' }}>
                <Choice options={['en', 'ar'] as const} value={lang} onChange={v => set({ lang: v })} labels={['English', 'العربية']} />
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Btn label={L.aBack} onPress={() => setStep(n => n - 1)} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="chevron" size={22} color={C.ink} stroke={2.4} flip={!ar} />
              </Btn>
              <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3].map(n => <View key={n} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: n <= step ? accent.fg : C.line }} />)}
              </View>
            </View>
            <T w={700} s={11.5} c={C.ink3}>{L.obStep.replace('{n}', String(step))}</T>

            {step === 1 && (
              <View style={{ gap: 12 }}>
                <T f="display" w={700} s={26} ls={ar ? 0 : -0.6}>{L.obAboutT}</T>
                <T w={500} s={14} c={C.ink2}>{L.obAboutS}</T>
                {(['name', 'uni', 'major'] as const).map(k => (
                  <TextInput key={k} value={profile[k]} onChangeText={v => setProfile(p => ({ ...p, [k]: v }))} placeholder={L[{ name: 'fName', uni: 'fUni', major: 'fMajor' }[k] as 'fName']}
                    placeholderTextColor={C.ink3} autoCapitalize="words" style={input} accessibilityLabel={L[{ name: 'fName', uni: 'fUni', major: 'fMajor' }[k] as 'fName']} />
                ))}
                {/* Implementation intention: deciding *when* doubles follow-through */}
                <T w={700} s={13} c={C.ink2} style={{ marginTop: 8 }}>{L.studyTimeQ}</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
                  {(['morning', 'afternoon', 'evening', 'night'] as const).map((k, i) => {
                    const on = studyTime === k;
                    return (
                      <Btn key={k} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setStudyTime(k)}
                        style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1.5, borderColor: on ? accent.a1 : C.line, backgroundColor: on ? accent.tint : C.card }}>
                        <T w={700} s={13} c={on ? accent.strong : C.ink2}>{L.studyTimes[i]}</T>
                      </Btn>
                    );
                  })}
                </View>
                <T w={500} s={12} c={C.ink3}>{L.studyTimeSub}</T>
              </View>
            )}

            {step === 2 && (
              <View style={{ gap: 12 }}>
                <T f="display" w={700} s={26} ls={ar ? 0 : -0.6}>{L.obSubjT}</T>
                <T w={500} s={14} c={C.ink2}>{L.obSubjS}</T>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput value={draft} onChangeText={setDraft} placeholder={L.obSubjPh} placeholderTextColor={C.ink3} autoFocus
                    onSubmitEditing={addSubject} blurOnSubmit={false} returnKeyType="done" style={[input, { flex: 1 }]} accessibilityLabel={L.subjName} />
                  <Btn label={L.addSubject} onPress={addSubject} style={{ width: 50, borderRadius: 14, backgroundColor: accent.tint, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="plus" size={18} color={accent.strong} stroke={2.6} />
                  </Btn>
                </View>
                {subjects.map((s, i) => (
                  <View key={s.name} style={{ padding: 12, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <T w={700} s={14.5} style={{ flex: 1 }}>{s.name}</T>
                      <Btn label={L.deleteSubject} onPress={() => setSubjects(x => x.filter((_, j) => j !== i))} style={{ padding: 4 }}>
                        <Icon name="trash" size={16} color={C.ink3} />
                      </Btn>
                    </View>
                    <Choice options={GRADES.slice(0, 5)} value={s.targetGrade} onChange={g => setSubjects(x => x.map((y, j) => (j === i ? { ...y, targetGrade: g } : y)))} labels={GRADES.slice(0, 5)} mono />
                  </View>
                ))}
              </View>
            )}

            {step === 3 && (
              <View style={{ gap: 14 }}>
                <T f="display" w={700} s={26} ls={ar ? 0 : -0.6}>{L.obExamT}</T>
                <T w={500} s={14} c={C.ink2}>{L.obExamS}</T>
                <T w={700} s={12} c={C.ink3}>{L.obWhich}</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
                  {[...subjects.map((s, i) => ({ label: s.name, v: i as number | null })), { label: L.obNoExam, v: null }].map(o => {
                    const on = examSubject === o.v;
                    return (
                      <Btn key={String(o.v)} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setExamSubject(o.v)}
                        style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1.5, borderColor: on ? accent.a1 : C.line, backgroundColor: on ? accent.tint : C.card }}>
                        <T w={700} s={13} c={on ? accent.strong : C.ink2}>{o.label}</T>
                      </Btn>
                    );
                  })}
                </View>
                {examSubject !== null && (
                  <>
                    <T w={700} s={12} c={C.ink3}>{L.obWhen}</T>
                    <Choice options={IN_DAYS} value={inDays} onChange={setInDays} labels={IN_DAYS.map(n => L.dIn.replace('{n}', String(n)))} />
                    <T w={700} s={12} c={C.ink3}>{L.obChapters}</T>
                    <Choice options={[2, 3, 4, 5, 6, 8]} value={chapters} onChange={setChapters} labels={['2', '3', '4', '5', '6', '8']} mono />
                  </>
                )}
              </View>
            )}

            <View style={{ flex: 1 }} />
            {step < 3
              ? <PrimaryBtn title={L.obNext} onPress={() => { if (step === 2) { const n = subjects.length + (draft.trim() ? 1 : 0); addSubject(); setExamSubject(n ? 0 : null); } setStep(step + 1); }} />
              : <PrimaryBtn title={L.obBuild} icon="sparkle" onPress={finish} />}
            {step === 2 && !subjects.length && (
              <Btn onPress={() => { setExamSubject(null); setStep(3); }} style={{ padding: 10, alignItems: 'center' }}>
                <T w={700} s={13.5} c={C.ink3}>{L.obSkip}</T>
              </Btn>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
