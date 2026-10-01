import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { KindBadge, SubjectTile } from '../components/Academic';
import { Choice, Page, Section } from '../components/Page';
import { Icon, PrimaryBtn, T } from '../components/ui';
import { ai } from '../ai';
import { useAcademic, hours } from '../lib/academic';
import { fmtDate, relDay } from '../lib/format';
import { useNazzim } from '../lib/store';

const CAPACITY = [60, 90, 120, 180, 240];

// RESCUE MODE: calm, honest, one action. Shows where things stand, rebuilds the week within the student's
// real daily time, and only changes the schedule when they apply it.
export default function Rescue() {
  const { C, L, ar, accent, today, dailyMinutes, set, applyRescue } = useNazzim();
  const { ctx, chapterTitle, subjectById } = useAcademic();
  const [built, setBuilt] = useState(false);
  const plan = useMemo(() => ai.generateRescuePlan(ctx), [ctx]);

  const label = (id: string, kind: 'session' | 'task') => {
    if (kind === 'task') {
      const t = ctx.tasks.find(x => x.id === id);
      return { title: t?.title ?? '', subjectId: t?.subjectId };
    }
    const s = ctx.sessions.find(x => x.id === id), e = ctx.exams.find(x => x.id === s?.examId);
    return { title: s ? `${chapterTitle(s, e)} · ${e?.subject ?? ''}` : '', subjectId: e?.subjectId };
  };
  const statusText = plan.status === 'tight' ? L.rescueTight : plan.moves.length || plan.dropped.length ? L.rescueOk.replace('{n}', String(plan.moves.length)) : L.rescueOnTrack;
  const statusTone = plan.status === 'tight' ? { bg: C.warningTint, fg: C.warningText, icon: 'alert' as const } : { bg: C.successTint, fg: C.successText, icon: 'check' as const };

  return (
    <Page title={L.rescueMenu}>
      <View style={{ alignItems: 'center', gap: 8, paddingTop: 4, paddingBottom: 6 }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: accent.tint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="calendar" size={34} color={accent.fg} stroke={1.8} />
          <View style={{ position: 'absolute', bottom: 6, end: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.warning, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg }}>
            <T w={800} s={12} c={C.onWarning}>!</T>
          </View>
        </View>
        <T f="display" w={700} s={22} ls={ar ? 0 : -0.5} style={{ textAlign: 'center' }}>{L.rescueTitle}</T>
        <T w={500} s={13.5} lh={1.5} c={C.ink2} style={{ textAlign: 'center', maxWidth: 320 }}>{L.rescueSub}</T>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { n: String(plan.overdue), l: L.rOverdueN, bg: C.dangerTint, fg: C.danger },
          { n: String(plan.upcomingExams), l: L.rExamsN, bg: C.warningTint, fg: C.warningText },
          { n: hours(plan.neededMin, ar), l: L.rWorkN, bg: accent.tint, fg: accent.strong },
        ].map(x => (
          <View key={x.l} style={{ flex: 1, minWidth: 0, padding: 12, borderRadius: 16, backgroundColor: x.bg, gap: 2 }}>
            <T f="grotesk" w={700} s={20} c={x.fg} numberOfLines={1}>{x.n}</T>
            <T w={600} s={11} c={x.fg}>{x.l}</T>
          </View>
        ))}
      </View>

      <Section label={L.capacityL}>
        <View style={{ padding: 12 }}>
          <Choice options={CAPACITY} value={dailyMinutes} onChange={m => set({ dailyMinutes: m })} labels={CAPACITY.map(m => hours(m, ar))} mono />
        </View>
      </Section>

      {!built && <PrimaryBtn title={L.buildRescue} icon="reset" onPress={() => setBuilt(true)} />}

      {built && (
        <>
          <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: statusTone.bg, alignItems: 'flex-start' }}>
            <Icon name={statusTone.icon} size={16} color={statusTone.fg} stroke={2.4} />
            <View style={{ flex: 1, gap: 4 }}>
              <T w={600} s={13} lh={1.45} c={statusTone.fg}>{statusText}</T>
              {!!plan.dropped.length && <T w={600} s={12} c={statusTone.fg}>{L.rescueDropped.replace('{n}', String(plan.dropped.length))}</T>}
            </View>
          </View>

          {plan.days.map(d => (
            <Section key={d.date} label={`${fmtDate(d.date, L)} · ${relDay(d.date, today, L)}`}>
              {d.items.map((it, i) => {
                const info = label(it.id, it.kind);
                const moved = it.from !== it.to, over = plan.tight.includes(it.id);
                return (
                  <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: i === d.items.length - 1 ? 0 : 1, borderBottomColor: C.line2 }}>
                    <SubjectTile subject={info.subjectId ? subjectById.get(info.subjectId) : undefined} size={32} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T w={600} s={13.5} numberOfLines={1}>{info.title}</T>
                      <T w={600} s={11.5} c={over ? C.warningText : C.ink3} style={{ marginTop: 2 }}>
                        {`${it.minutes} ${L.min}${moved ? ' · ' + L.movedFrom.replace('{d}', fmtDate(it.from, L)) : ''}${over ? ' · ' + L.tightL : ''}`}
                      </T>
                    </View>
                    <KindBadge kind={it.kind} />
                  </View>
                );
              })}
            </Section>
          ))}

          <PrimaryBtn title={L.applyRescue} icon="check" disabled={!plan.moves.length && !plan.dropped.length}
            onPress={() => { applyRescue(plan); router.back(); }} />
        </>
      )}

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
        <Icon name="shield" size={14} color={C.ink3} />
        <T w={500} s={12} c={C.ink3} style={{ textAlign: 'center', flexShrink: 1 }}>{L.rescueNote}</T>
      </View>
    </Page>
  );
}
