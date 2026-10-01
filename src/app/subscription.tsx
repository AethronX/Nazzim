import { View } from 'react-native';
import { Page } from '../components/Page';
import { Btn, Icon, T } from '../components/ui';
import { fmtPrice, planConfig, yearlySaving } from '../config/plans';
import { useNazzim, type Tier } from '../lib/store';

const ORDER: Tier[] = ['free', 'plus', 'pro'];

// Three plans. Pro sits on the midnight brand surface (the one dark card), Plus is outlined in Blue 500,
// Free is a plain card. App Store Guideline 3.1.2: price, period, trial, auto-renewal and how to cancel are
// shown before purchase, with Restore / Terms / Privacy. Purchases are not wired to StoreKit yet.
export default function Subscription() {
  const { C, L, ar, accent, tier, plan: billing, set, subscribe } = useNazzim();
  const yearly = billing === 'year';

  // Prices come from the plan config (remote-overridable), never from copy.
  const priceOf = (k: Tier) => (k === 'free' ? fmtPrice(0, ar) : fmtPrice(planConfig().prices[k][yearly ? 'year' : 'month'], ar));
  const perMonthOnYear = (k: Tier) => (k === 'free' ? '' : fmtPrice(planConfig().prices[k].year / 12, ar));
  const selectedPaid: Tier = tier === 'free' ? 'pro' : tier;
  const legal = L.legal.replace('{p}', `${priceOf(selectedPaid)} ${yearly ? L.perYear : L.perMonth}`);

  return (
    <Page title={L.plans} sub={L.plansSub}>
      {/* Billing period */}
      <View style={{ flexDirection: 'row', alignSelf: 'center', padding: 4, borderRadius: 99, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, gap: 4 }} accessibilityRole="radiogroup">
        {(['month', 'year'] as const).map(k => {
          const on = billing === k;
          return (
            <Btn key={k} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => set({ plan: k })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99, backgroundColor: on ? C.inv : 'transparent' }}>
              <T w={700} s={13} c={on ? C.onInv : C.ink2}>{k === 'month' ? L.monthly : L.yearly}</T>
              {k === 'year' && (
                <View style={{ paddingVertical: 2, paddingHorizontal: 7, borderRadius: 99, backgroundColor: on ? accent.a1 : accent.tint }}>
                  <T w={800} s={9.5} c={on ? C.onAccent : accent.strong}>{L.save.replace('{n}', String(yearlySaving('plus')))}</T>
                </View>
              )}
            </Btn>
          );
        })}
      </View>

      {ORDER.map(k => {
        const t = L.tiers[k];
        const current = tier === k;
        const pro = k === 'pro', plus = k === 'plus';
        const ink = pro ? C.onHero : C.ink, ink2 = pro ? C.onHero2 : C.ink2, ink3 = pro ? C.onHero3 : C.ink3;
        const check = pro ? C.onHeroAccent : accent.fg;
        const cta = current ? L.currentPlan : k === 'free' ? L.switchFree : (tier === 'free' ? L.trialCta : L.choose.replace('{name}', t.name));
        return (
          <View key={k}
            style={{
              borderRadius: 24, padding: 18, gap: 14,
              backgroundColor: pro ? C.hero : C.card,
              borderWidth: pro ? 0 : plus ? 1.5 : 1, borderColor: plus ? accent.a1 : C.line,
              boxShadow: pro ? C.shadowHero : undefined,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T f="display" w={700} s={22} ls={ar ? 0 : -0.5} c={ink} style={{ flex: 1 }}>{L.appName + ' ' + t.name}</T>
              {pro && !current && (
                <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99, backgroundColor: accent.a1 }}>
                  <T w={800} s={10} c={C.onAccent}>{L.bestValue}</T>
                </View>
              )}
              {current && (
                <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99, backgroundColor: pro ? C.onHeroTrack : accent.tint }}>
                  <T w={800} s={10} c={pro ? C.onHero : accent.strong}>{L.currentPlan}</T>
                </View>
              )}
            </View>
            <T w={600} s={13} c={ink2} style={{ marginTop: -8 }}>{t.tag}</T>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <T f="grotesk" w={700} s={36} ls={-1.4} c={ink}>{priceOf(k)}</T>
              <T w={600} s={13} c={ink3}>{k === 'free' ? t.per : yearly ? L.perYear : L.perMonth}</T>
            </View>
            {yearly && k !== 'free' && (
              <T w={600} s={12} c={pro ? C.onHeroAccent : accent.fg} style={{ marginTop: -10 }}>{L.yearNote.replace('{m}', perMonthOnYear(k))}</T>
            )}

            <View style={{ gap: 9, borderTopWidth: 1, borderTopColor: pro ? C.onHeroLine : C.line2, paddingTop: 14 }}>
              {t.features.map(f => (
                <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name="check" size={15} color={check} stroke={3} />
                  <T w={600} s={13.5} c={ink} style={{ flex: 1 }}>{f}</T>
                </View>
              ))}
            </View>

            <Btn
              disabled={current}
              onPress={() => subscribe(k)}
              pressedBg={pro ? accent.wash : plus ? accent.strong : undefined}
              accessibilityState={{ disabled: current, selected: current }}
              style={{
                padding: 15, borderRadius: 15, alignItems: 'center',
                backgroundColor: current ? (pro ? C.onHeroTrack : C.line2) : pro ? C.onHero : plus ? accent.a1 : 'transparent',
                borderWidth: !current && k === 'free' ? 1 : 0, borderColor: C.line,
                boxShadow: !current && plus ? accent.glow : undefined,
              }}>
              <T w={800} s={14.5} c={current ? ink3 : pro ? accent.deep : plus ? C.onAccent : C.ink2}>{cta}</T>
            </Btn>
          </View>
        );
      })}

      <T w={500} s={11} lh={1.55} c={C.ink3} style={{ textAlign: 'center', paddingHorizontal: 8 }}>{legal}</T>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
        {[L.restore, L.terms, L.privacyL].map(l => (
          <Btn key={l} accessibilityRole="link" pressScale={1} style={{ paddingVertical: 6 }}>
            <T w={700} s={12} c={C.ink2}>{l}</T>
          </Btn>
        ))}
      </View>
    </Page>
  );
}

