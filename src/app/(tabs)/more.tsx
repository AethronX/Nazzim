import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking, ScrollView, View } from 'react-native';
import { Avatar, Row, Section } from '../../components/Page';
import { ExamCard } from '../../components/Study';
import { Btn, Eyebrow, Icon, T } from '../../components/ui';
import { useChrome } from '../../lib/layout';
import { useNazzim } from '../../lib/store';

const extra = (Constants.expoConfig?.extra ?? {}) as { supportUrl?: string };
const URLS = { support: extra.supportUrl ?? 'https://nazzim.app/support' };

// MORE: who you are, what's coming up, and everything that isn't a daily action.
export default function More() {
  const { C, L, ar, me, tier, exams, tasks, today, account, syncState } = useNazzim();
  const openTasks = tasks.filter(x => !x.done).length;
  const { headerTop, scrollBottom } = useChrome();
  const upcoming = exams.filter(e => e.date > today).slice(0, 3);

  return (
    <View style={{ flex: 1, direction: ar ? 'rtl' : 'ltr' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: headerTop, paddingHorizontal: 18, paddingBottom: scrollBottom, gap: 12 }}>
        <T f="display" w={700} s="display" ls={ar ? 0 : -0.8} accessibilityRole="header" style={{ marginBottom: 4 }}>{L.more}</T>

        <Btn pressScale={0.99} onPress={() => router.push('/profile')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
          <Avatar name={me.name} size={48} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T f="display" w={700} s="heading" numberOfLines={1}>{me.name || L.noName}</T>
            <T w={600} s="caption" c={C.ink3} numberOfLines={1}>{[me.major, L.tiers[tier].name].filter(Boolean).join(' · ')}</T>
          </View>
          <Icon name="chevron" size={15} color={C.ink3} stroke={2.3} flip={ar} />
        </Btn>

        {!!upcoming.length && (
          <View style={{ gap: 8, marginTop: 8 }}>
            <View style={{ paddingHorizontal: 4 }}><Eyebrow>{L.upcomingExams.toUpperCase()}</Eyebrow></View>
            {upcoming.map(e => <ExamCard key={e.id} exam={e} />)}
          </View>
        )}

        {/* Grouped like iOS Settings: who you are, how you study, the app itself */}
        <Section label={L.secAccount}>
          <Row icon="user" title={L.acTitle} sub={account ? (syncState === 'error' ? L.acSyncError : account.email) : L.acSub} onPress={() => router.push('/account')} />
          <Row icon="crown" title={L.plans} sub={L.tiers[tier].name} onPress={() => router.push('/subscription')} last />
        </Section>
        <Section label={L.secStudy}>
          <Row icon="check" title={L.tasksTitle} sub={openTasks ? L.tkOpenN.replace('{n}', String(openTasks)) : undefined} onPress={() => router.push('/tasks')} />
          <Row icon="chart" title={L.progressMenu} onPress={() => router.push('/progress')} />
          <Row icon="reset" title={L.rescueMenu} onPress={() => router.push('/rescue')} last />
        </Section>
        <Section label={L.secApp}>
          <Row icon="gear" title={L.settings} onPress={() => router.push('/settings')} />
          <Row icon="help" title={L.support} onPress={() => Linking.openURL(URLS.support).catch(() => {})} last />
        </Section>
      </ScrollView>
    </View>
  );
}
