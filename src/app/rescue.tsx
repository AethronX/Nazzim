import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { KindBadge, SubjectTile } from '../components/Academic';
import { Choice, Page, Section } from '../components/Page';
import { Btn, Icon, PrimaryBtn, T } from '../components/ui';
import { ai } from '../ai';
import { triageToday } from '../engine/rescue';
import { rankEvidence } from '../lib/readiness';
import { useAcademic, hours } from '../lib/academic';
import { fmtDate, relDay } from '../lib/format';
import { unitOf } from '../lib/copy';
import { useNazzim } from '../lib/store';

const CAPACITY = [60, 90, 120, 180, 240];

// RESCUE MODE: calm, honest, one action. Shows where things stand, rebuilds the week within the student's
// real daily time, and only changes the schedule when they apply it.
export default function Rescue() {
  const { C, L, ar, accent, today, cards, dailyMinutes, set, applyRescue, startFocusOn } = useNazzim();
  const { ctx, chapterTitle, subjectById } = useAcademic();
  const [built, setBuilt] = useState(false);
  const plan = useMemo(() => ai.generateRescuePlan(ctx), [ctx]);
  // The shortlist comes first; the seven-day rebuild is still here, below, behind its own button.
  const targets = useMemo(() => rankEvidence(ctx.exams, ctx.sessions, cards, today), [ctx.exams, ctx.sessions, cards, today]);
  const triage = useMemo(() => triageToday(ctx, targets), [ctx, targets]);

  const itemInfo = (it: (typeof triage.now)[number]) => {
    if (it.kind === 'task') {
      const t = ctx.tasks.find(x => x.id === it.id);
      return { title: t?.title ?? '', subjectId: t?.subjectId, onPress: () => t && startFocusOn(t.title, { kind: 'task', id: t.id }, t.estimateMin) };
    }
    const exam = ctx.exams.find(x => x.id === it.examId);
    if (it.kind === 'recall') {
      const ch = it.chapter !== undefined && it.chapter >= 0 ? exam?.chapters[it.chapter] ?? '' : L.exAll;
      return { title: `${L.evRecall.replace('{c}', ch)}`, subjectId: exam?.subjectId, onPress: () => exam && router.push(`/recall/${exam.id}`) };
    }
    const s = ctx.sessions.find(x => x.id === it.id);
    return {
      title: s ? `${chapterTitle(s, exam)} · ${exam?.subject ?? ''}` : '',
      subjectId: exam?.subjectId,
      onPress: () => s && startFocusOn(`${chapterTitle(s, exam)} · ${exam?.subject ?? ''}`, { kind: 'session', id: s.id }, s.minutes),
    };
  };

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
            <T w={800} s="caption" c={C.onWarning}>!</T>
          </View>
        </View>
        <T f="display" w={700} s="title" ls={ar ? 0 : -0.5} style={{ textAlign: 'center' }}>{L.rescueTitle}</T>
        <T w={500} s="label" lh={1.5} c={C.ink2} style={{ textAlign: 'center', maxWidth: 320 }}>{L.rescueSub}</T>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { n: String(plan.overdue), l: L.rOverdueN.replace('{u}', unitOf(plan.overdue, 'task', L, ar)), bg: C.dangerTint, fg: C.danger },
          { n: String(plan.upcomingExams), l: L.rExamsN.replace('{u}', unitOf(plan.upcomingExams, 'exam', L, ar)), bg: C.warningTint, fg: C.warningText },
          { n: hours(plan.neededMin, ar), l: L.rWorkN, bg: accent.tint, fg: accent.strong },
        ].map(x => (
          <View key={x.l} style={{ flex: 1, minWidth: 0, padding: 12, borderRadius: 16, backgroundColor: x.bg, gap: 2 }}>
            <T w={700} s="title" c={x.fg} numberOfLines={1}>{x.n}</T>
            <T w={600} s="caption" c={x.fg}>{x.l}</T>
          </View>
        ))}
      </View>

      {/* NOW: at most three things, chosen by evidence gained per minute, and they fit in a normal day. */}
      {triage.now.length ? (
        <Section label={`${L.trNow} · ${L.trCapacity.replace('{a}', hours(triage.committedMin, ar)).replace('{b}', hours(triage.capacityMin, ar))}`}>
          {triage.now.map((it, i) => {
            const info = itemInfo(it);
            return (
              <Btn key={it.kind + it.id} onPress={info.onPress} pressScale={0.99} accessibilityLabel={`${L.evStart}: ${info.title}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: i === triage.now.length - 1 ? 0 : 1, borderBottomColor: C.line2 }}>
                <View style={{ width: 26, height: 26, borderRadius: 99, backgroundColor: accent.tint, alignItems: 'center', justifyContent: 'center' }}>
                  <T num="data" w={800} s="caption" c={accent.strong}>{String(i + 1)}</T>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T w={600} s="label" numberOfLines={1}>{info.title}</T>
                  <T w={600} s="caption" c={C.ink3} style={{ marginTop: 2 }}>{`${it.minutes} ${L.min} · ${L.trWhy[it.why]}`}</T>
                </View>
                <Icon name="play" size={15} color={accent.fg} />
              </Btn>
            );
          })}
        </Section>
      ) : (
        <View style={{ padding: 14, borderRadius: 16, backgroundColor: C.successTint }}>
          <T w={600} s="label" c={C.successText}>{L.trNothing}</T>
        </View>
      )}

      {!!triage.later.length && (
        <Section label={L.trLater}>
          {triage.later.slice(0, 6).map((it, i, arr) => {
            const info = itemInfo(it);
            return (
              <View key={it.kind + it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: C.line2 }}>
                <SubjectTile subject={info.subjectId ? subjectById.get(info.subjectId) : undefined} size={26} />
                <T w={600} s="label" c={C.ink2} style={{ flex: 1 }} numberOfLines={1}>{info.title}</T>
                <T w={600} s="caption" c={C.ink3}>{`${it.minutes} ${L.min}`}</T>
              </View>
            );
          })}
        </Section>
      )}

      <Section label={L.capacityL}>
        <View style={{ padding: 12 }}>
          <Choice options={CAPACITY} value={dailyMinutes} onChange={m => set({ dailyMinutes: m })} labels={CAPACITY.map(m => hours(m, ar))} />
        </View>
      </Section>

      {!built && <PrimaryBtn title={L.trRebuild} icon="reset" onPress={() => setBuilt(true)} />}

      {built && (
        <>
          <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: statusTone.bg, alignItems: 'flex-start' }}>
            <Icon name={statusTone.icon} size={16} color={statusTone.fg} stroke={2.4} />
            <View style={{ flex: 1, gap: 4 }}>
              <T w={600} s="label" lh={1.45} c={statusTone.fg}>{statusText}</T>
              {!!plan.dropped.length && <T w={600} s="caption" c={statusTone.fg}>{L.rescueDropped.replace('{n}', String(plan.dropped.length))}</T>}
            </View>
          </View>

          {plan.days.map(d => (
            <Section key={d.date} label={`${fmtDate(d.date, L)} · ${relDay(d.date, today, L, ar)}`}>
              {d.items.map((it, i) => {
                const info = label(it.id, it.kind);
                const moved = it.from !== it.to, over = plan.tight.includes(it.id);
                return (
                  <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: i === d.items.length - 1 ? 0 : 1, borderBottomColor: C.line2 }}>
                    <SubjectTile subject={info.subjectId ? subjectById.get(info.subjectId) : undefined} size={32} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T w={600} s="label" numberOfLines={1}>{info.title}</T>
                      <T w={600} s="caption" c={over ? C.warningText : C.ink3} style={{ marginTop: 2 }}>
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
        <T w={500} s="caption" c={C.ink3} style={{ textAlign: 'center', flexShrink: 1 }}>{L.rescueNote}</T>
      </View>
    </Page>
  );
}
