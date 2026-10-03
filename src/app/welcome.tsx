import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoMark } from '../components/Logo';
import { Choice } from '../components/Page';
import { Btn, Icon, PrimaryBtn, T } from '../components/ui';
import { isDateKey } from '../domain/validate';
import { addDays, daysBetween, todayKey } from '../lib/exams';
import { fmtDate, inDays as inDaysLabel } from '../lib/format';
import { useNazzim, type Onboarding } from '../lib/store';
import { font, TEXT } from '../lib/theme';

const QUICK_DAYS = [3, 7, 14, 21, 30];

// FIRST RUN asks for the three things the evidence model cannot work without, and nothing else:
//
//   subject → exam date → chapter names → go
//
// What it used to ask first was the student's name, university and major. None of those feed the plan, the
// evidence number or the next action; they were three text fields standing between a new student and the
// only thing that would show them why the app exists. They live in Profile now, where they belong.
//
// Chapters are typed, not counted. A generated "Chapter 3" propagates into every Next Evidence sentence the
// student will ever read ("self-test Chapter 3"), and tells them nothing.
export default function Welcome() {
  const { C, L, ar, accent, lang, set, onboard, loadSample } = useNazzim();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [subject, setSubject] = useState('');
  const [inDays, setInDays] = useState(7);
  const [chaptersText, setChaptersText] = useState('');
  const today = todayKey();
  const date = addDays(today, inDays);
  const chapters = chaptersText.split('\n').map(c => c.trim()).filter(Boolean);

  const input = { fontFamily: font('body', 600, ar), fontSize: TEXT.body, color: C.ink, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, textAlign: ar ? 'right' : 'left' } as const;

  // The date is validated here as well as in the store: a future, real calendar day or nothing is created.
  const dateOk = isDateKey(date) && daysBetween(today, date) >= 1;
  const canGo = subject.trim().length > 0 && chapters.length > 0 && dateOk;

  const finish = () => {
    if (!canGo) return;
    const o: Onboarding = { profile: {}, subjects: [{ name: subject.trim(), targetGrade: 'A' }], exam: { subject: 0, inDays, chapters } };
    onboard(o);
    router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, direction: ar ? 'rtl' : 'ltr' }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24, paddingHorizontal: 22, gap: 16 }}>
        {step === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', gap: 28 }}>
            <View style={{ alignItems: 'center', gap: 16 }}>
              <LogoMark width={72} bowl={accent.a1} dot={accent.a1} />
              <T f="display" w={700} s="hero" ls={ar ? 0 : -1}>{L.appName}</T>
              <T w={600} s="heading" lh={1.45} c={C.ink2} style={{ textAlign: 'center', maxWidth: 300 }}>{L.obTag}</T>
            </View>
            <View style={{ gap: 10 }}>
              <PrimaryBtn title={L.obStart} onPress={() => setStep(1)} />
              <Btn onPress={() => { loadSample(); router.replace('/'); }} style={{ padding: 14, borderRadius: 16, alignItems: 'center' }}>
                <T w={700} s="label" c={accent.fg}>{L.obSample}</T>
              </Btn>
              <Btn onPress={() => router.push('/account')} style={{ padding: 10, alignItems: 'center' }}>
                <T w={700} s="label" c={C.ink2}>{L.obHaveAccount}</T>
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
            <T w={700} s="caption" c={C.ink3}>{L.obStep.replace('{n}', String(step))}</T>

            {step === 1 && (
              <View style={{ gap: 12 }}>
                <T f="display" w={700} s="display" ls={ar ? 0 : -0.6}>{L.obSubjOne}</T>
                <T w={500} s="label" lh={1.5} c={C.ink2}>{L.obSubjOneS}</T>
                <TextInput value={subject} onChangeText={setSubject} placeholder={L.obSubjPh} placeholderTextColor={C.ink3}
                  autoCapitalize="words" autoFocus returnKeyType="next" style={input} accessibilityLabel={L.obSubjOne} />
              </View>
            )}

            {step === 2 && (
              <View style={{ gap: 14 }}>
                <T f="display" w={700} s="display" ls={ar ? 0 : -0.6}>{L.obDateT}</T>
                <T w={500} s="label" lh={1.5} c={C.ink2}>{L.obDateS}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Btn label="−1" onPress={() => setInDays(n => Math.max(1, n - 1))} style={stepper(C.line)}>
                    <T ltr w={700} s="title" c={C.ink2}>−</T>
                  </Btn>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <T f="display" w={700} s="title" ls={ar ? 0 : -0.4}>{fmtDate(date, L)}</T>
                    <T w={600} s="caption" c={accent.fg} style={{ marginTop: 2 }}>{inDaysLabel(inDays, L, ar)}</T>
                  </View>
                  <Btn label="+1" onPress={() => setInDays(n => Math.min(365, n + 1))} style={stepper(C.line)}>
                    <T ltr w={700} s="title" c={C.ink2}>+</T>
                  </Btn>
                </View>
                <Choice options={QUICK_DAYS} value={inDays} onChange={setInDays} labels={QUICK_DAYS.map(n => inDaysLabel(n, L, ar))} />
              </View>
            )}

            {step === 3 && (
              <View style={{ gap: 12 }}>
                <T f="display" w={700} s="display" ls={ar ? 0 : -0.6}>{L.obChapT}</T>
                <T w={500} s="label" lh={1.5} c={C.ink2}>{L.obChapS}</T>
                <TextInput value={chaptersText} onChangeText={setChaptersText} placeholder={L.obChapPh} placeholderTextColor={C.ink3}
                  multiline textAlignVertical="top" autoFocus accessibilityLabel={L.obChapT}
                  style={[input, { minHeight: 150, lineHeight: 24 }]} />
                <T w={600} s="caption" c={C.ink3}>{L.obLater}</T>
              </View>
            )}

            <View style={{ flex: 1 }} />
            {step < 3
              ? <PrimaryBtn title={L.obNext} onPress={() => setStep(step + 1)} disabled={step === 1 && !subject.trim()} />
              : <PrimaryBtn title={L.obGo} icon="sparkle" onPress={finish} disabled={!canGo} />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const stepper = (border: string) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }) as const;
