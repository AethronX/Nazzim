import Constants from 'expo-constants';
import { Linking, View } from 'react-native';
import { Choice, Page, Row, Section } from '../components/Page';
import { Btn, T, Toggle } from '../components/ui';
import { hhmm } from '../components/Habits';
import { reminderTime } from '../engine/habits';
import { remindersSupported } from '../lib/reminders';
import { useNazzim, type Appearance } from '../lib/store';
import { ACCENT_KEYS, ACCENTS } from '../lib/theme';

// Legal/support URLs come from app.json (expo.extra), so they can change without a new build.
const extra = (Constants.expoConfig?.extra ?? {}) as { privacyPolicyUrl?: string; termsUrl?: string; supportUrl?: string };
const URLS = {
  privacy: extra.privacyPolicyUrl ?? 'https://nazzim.app/privacy',
  terms: extra.termsUrl ?? 'https://nazzim.app/terms',
  support: extra.supportUrl ?? 'https://nazzim.app/support',
};
const open = (url: string) => { Linking.openURL(url).catch(() => {}); };

const APPEARANCES: Appearance[] = ['system', 'light', 'dark'];
const FOCUS_LENGTHS = [25, 50, 90];

export default function Settings() {
  const {
    C, L, ar, set, appearance, accentKey, reminders, setReminders, remDenied, preset, setPreset, haptics, rewards, aiTips, setDel, studyTime,
  } = useNazzim();

  return (
    <Page title={L.settings}>
      <Section label={L.sGeneral}>
        <Row icon="globe" title={L.language} onPress={() => set({ lang: ar ? 'en' : 'ar' })}
          right={<T w={700} s={12.5} c={C.ink2}>{L.langValue}</T>} chevron />
        <Row icon="contrast" title={L.appearance}
          right={<Choice options={APPEARANCES} value={appearance} onChange={a => set({ appearance: a })} labels={L.appearances} />} />
        <Row icon="palette" title={L.accentColor} sub={L.accentNames[ACCENT_KEYS.indexOf(accentKey)]} last
          right={
            <View style={{ flexDirection: 'row', gap: 10 }} accessibilityRole="radiogroup">
              {ACCENT_KEYS.map((k, i) => {
                const on = accentKey === k;
                return (
                  <Btn key={k} accessibilityRole="radio" accessibilityLabel={L.accentNames[i]} accessibilityState={{ checked: on }}
                    onPress={() => set({ accentKey: k })} pressScale={0.9}
                    style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? ACCENTS[k][500] : 'transparent' }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: ACCENTS[k][500] }} />
                  </Btn>
                );
              })}
            </View>
          } />
      </Section>

      <Section label={L.reminders.toUpperCase()}>
        <Row icon="bell" title={L.reminders} sub={remindersSupported ? L.remindersSub : L.remWeb} last={!reminders.on && !remDenied}
          right={<Toggle on={reminders.on} disabled={!remindersSupported} onPress={() => setReminders({ on: !reminders.on })} label={L.reminders} />} />
        {remDenied && !reminders.on && (
          <T w={600} s={11.5} lh={1.45} c={C.danger} style={{ paddingHorizontal: 16, paddingBottom: 13 }}>{L.remDenied}</T>
        )}
        {reminders.on && (
          <>
            <Row title={L.remHabits} sub={L.remDailyAt.replace('{t}', hhmm(reminderTime(studyTime)))} style={{ paddingStart: 46 }}
              right={<Toggle on={reminders.habits} onPress={() => setReminders({ habits: !reminders.habits })} label={L.remHabits} />} />
            <Row title={L.remExams} sub={L.remExamsSub} style={{ paddingStart: 46 }}
              right={<Toggle on={reminders.exams} onPress={() => setReminders({ exams: !reminders.exams })} label={L.remExams} />} />
            <Row title={L.remFocus} sub={L.remFocusSub} style={{ paddingStart: 46 }} last
              right={<Toggle on={reminders.focus} onPress={() => setReminders({ focus: !reminders.focus })} label={L.remFocus} />} />
          </>
        )}
      </Section>

      <Section label={L.sControls}>
        <Row icon="clock" title={L.studyTimeQ} sub={L.studyTimeSub}>
          <Choice options={['morning', 'afternoon', 'evening', 'night'] as const} value={studyTime} onChange={v => set({ studyTime: v })} labels={L.studyTimes} />
        </Row>
        <Row icon="target" title={L.cFocusLen}
          right={<Choice options={FOCUS_LENGTHS} value={preset} onChange={setPreset} labels={FOCUS_LENGTHS.map(m => m + (ar ? ' د' : ' min'))} mono />} />
        <Row icon="flame" title={L.cRewards} sub={L.cRewardsSub}
          right={<Toggle on={rewards} onPress={() => set({ rewards: !rewards })} label={L.cRewards} />} />
        <Row icon="sparkle" title={L.cAi} sub={L.cAiSub}
          right={<Toggle on={aiTips} onPress={() => set({ aiTips: !aiTips })} label={L.cAi} />} />
        <Row icon="vibrate" title={L.cHaptics} sub={L.cHapticsSub} last
          right={<Toggle on={haptics} onPress={() => set({ haptics: !haptics })} label={L.cHaptics} />} />
      </Section>

      <Section label={L.sAccount}>
        <Row icon="shield" title={L.privacyL} onPress={() => open(URLS.privacy)} />
        <Row icon="doc" title={L.terms} onPress={() => open(URLS.terms)} />
        <Row icon="help" title={L.support} onPress={() => open(URLS.support)} />
        <Row icon="trash" title={L.deleteAcc} danger last onPress={() => setDel(true)} chevron={false} />
      </Section>

      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        <T w={600} s={11.5} c={C.ink3}>{L.version}</T>
      </View>
    </Page>
  );
}
