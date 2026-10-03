import { router } from 'expo-router';
import { View } from 'react-native';
import { Page } from '../components/Page';
import { Button, Icon, T } from '../components/ui';
import { useNazzim } from '../lib/store';

// Pro is not purchasable yet, so this screen never offers a purchase — App Store Guideline 2.2 / 3.1.1: no
// non-functional buy buttons, no price/renewal/restore flow before StoreKit is wired. It sets expectations
// honestly: everything is free now, and it previews what Pro will add. When billing ships, this screen
// becomes the paywall again (price, period, trial, auto-renewal, Restore/Terms/Privacy).
export default function Subscription() {
  const { C, L, ar, accent } = useNazzim();
  const pro = L.tiers.pro;

  return (
    <Page title={L.plans} sub={L.plansSub}>
      {/* The one hero: Pro, clearly marked as coming — no price, no purchase. */}
      <View style={{ borderRadius: 24, padding: 22, gap: 14, backgroundColor: C.hero, boxShadow: C.shadowHero }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: C.onHeroTrack, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="crown" size={22} color={C.onHero} stroke={2.2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T f="display" w={700} s="title" ls={ar ? 0 : -0.5} c={C.onHero}>{L.appName + ' ' + pro.name}</T>
          </View>
          <View style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 99, backgroundColor: accent.a1 }}>
            <T w={800} s="micro" c={C.onAccent}>{L.csBadge}</T>
          </View>
        </View>
        <T w={700} s="heading" lh={1.3} c={C.onHero}>{L.csTitle}</T>
        <T w={500} s="label" lh={1.6} c={C.onHero2}>{L.csSub}</T>
      </View>

      {/* Reassurance: nothing is locked today. */}
      <View style={{ flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, backgroundColor: C.successTint, alignItems: 'center' }}>
        <Icon name="check" size={18} color={C.successText} stroke={3} />
        <T w={700} s="label" lh={1.5} c={C.successText} style={{ flex: 1 }}>{L.csFreeNow}</T>
      </View>

      {/* What Pro will add, drawn from the Pro tier's own feature list. */}
      <View style={{ gap: 12 }}>
        <T w={800} s="micro" ls={ar ? 0 : 1.2} c={C.ink3} style={{ paddingHorizontal: 4 }}>{L.csWhat}</T>
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 18, gap: 12 }}>
          {pro.features.map(f => (
            <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: accent.tint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="sparkle" size={13} color={accent.fg} stroke={2.4} />
              </View>
              <T w={600} s="label" c={C.ink} style={{ flex: 1 }}>{f}</T>
            </View>
          ))}
        </View>
      </View>

      <Button variant="secondary" title={L.csBack} icon="arrow" onPress={() => router.back()} />
    </Page>
  );
}
