import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { ai } from '../ai';
import type { PlanReason, PlanRequest } from '../ai/planner';
import { SubjectTile } from '../components/Academic';
import { Page, Section } from '../components/Page';
import { Btn, Icon, PrimaryBtn, T } from '../components/ui';
import { hours, useAcademic } from '../lib/academic';
import type { Copy } from '../lib/copy';
import { fmtDate, relDay } from '../lib/format';
import { useNazzim } from '../lib/store';
import { font } from '../lib/theme';

// SMART PLANNER: an action engine, not a chat. One sentence → a concrete plan with its reasons → one tap adds it.
export default function Planner() {
  const { C, L, ar, accent, today, applyPlan, atExamLimit, hitLimit } = useNazzim();
  const { ctx, subjectById } = useAcademic();
  // `q` prefills the request (e.g. "Change date or chapters" on an exam) and runs it right away.
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState(q ?? '');
  const [req, setReq] = useState<PlanRequest | null>(() => {
    const r = q ? ai.parsePlanRequest(q, ctx) : null;
    return r?.ok ? r.req : null;
  });
  const [missing, setMissing] = useState(false);

  const run = (t = text) => {
    if (t !== text) setText(t);
    const r = ai.parsePlanRequest(t, ctx);
    if (r.ok) { setReq(r.req); setMissing(false); } else { setReq(null); setMissing(true); }
  };
  const prop = useMemo(() => (req ? ai.proposePlan(req, ctx, n => L.plChapterN.replace('{n}', String(n))) : null), [req, ctx, L]);
  const subject = req?.subjectId ? subjectById.get(req.subjectId) : undefined;
  const adjust = (patch: Partial<PlanRequest>) => setReq(r => (r ? { ...r, ...patch } : r));
  const sessionLabel = (kind: string, chapter: number) =>
    chapter < 0 ? L.kMock : `${prop!.chapters[chapter]} · ${kind === 'learn' ? L.kLearn : L.kReview}`;

  return (
    <Page title={L.plTitle} sub={L.plSub}>
      <View style={{ backgroundColor: C.card, borderRadius: 20, borderWidth: 1.5, borderColor: accent.a1, padding: 6 }}>
        <TextInput value={text} onChangeText={setText} placeholder={L.plPh} placeholderTextColor={C.ink3} multiline autoFocus={!q}
          onSubmitEditing={() => run()} blurOnSubmit returnKeyType="go" accessibilityLabel={L.plTitle}
          style={{ fontFamily: font('body', 600, ar), fontSize: 15.5, lineHeight: 22, color: C.ink, minHeight: 64, padding: 12, textAlign: ar ? 'right' : 'left', textAlignVertical: 'top' }} />
      </View>
      <PrimaryBtn title={L.plRun} icon="sparkle" disabled={!text.trim()} onPress={() => run()} />

      {!req && (
        <View style={{ gap: 8 }}>
          {missing && (
            <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: accent.tint }}>
              <Icon name="help" size={16} color={accent.strong} />
              <T w={600} s="label" lh={1.45} c={accent.strong} style={{ flex: 1 }}>{L.plNeed}</T>
            </View>
          )}
          {L.plTry.map(ex => (
            <Btn key={ex} onPress={() => run(ex)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
              <Icon name="arrow" size={14} color={accent.fg} flip={ar} />
              <T w={600} s="label" c={C.ink2} style={{ flex: 1 }}>{ex}</T>
            </Btn>
          ))}
        </View>
      )}

      {prop && req && (
        <>
          {/* What Nazzim understood — every part is editable */}
          <View style={{ backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <SubjectTile subject={subject ?? { color: 'indigo', icon: 'book' }} size={44} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T f="display" w={700} s="heading" numberOfLines={1}>{subject ? subject.name : L.plNewSubject.replace('{s}', req.subjectName)}</T>
                <T w={600} s="caption" c={C.ink3}>{`${L.plWhen} · ${fmtDate(prop.examDate, L)} · ${relDay(prop.examDate, today, L, ar)}`}</T>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Stepper label={L.plWhen} value={relDay(prop.examDate, today, L, ar)} onMinus={() => adjust({ inDays: Math.max(1, req.inDays - 1) })} onPlus={() => adjust({ inDays: Math.min(90, req.inDays + 1) })} />
              <Stepper label={L.plChapters} value={String(req.chapters)} onMinus={() => adjust({ chapters: Math.max(1, req.chapters - 1) })} onPlus={() => adjust({ chapters: Math.min(20, req.chapters + 1) })} />
            </View>
          </View>

          <Section label={L.plDays.replace('{n}', String(prop.days.length))}>
            {prop.days.map((d, i) => (
              <View key={d.date} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: i === prop.days.length - 1 ? 0 : 1, borderBottomColor: C.line2 }}>
                <View style={{ width: 78 }}>
                  <T w={700} s="caption">{cap(relDay(d.date, today, L, ar))}</T>
                  <T f="grotesk" w={600} s="caption" c={C.ink3}>{hours(d.minutes, ar)}</T>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  {d.sessions.map(s => (
                    <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.kind === 'mock' ? C.warning : s.kind === 'learn' ? accent.a1 : accent.tint2 }} />
                      <T w={600} s="caption" c={C.ink2} numberOfLines={1} style={{ flex: 1 }}>{sessionLabel(s.kind, s.chapter)}</T>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </Section>

          <Section label={L.plWhy}>
            <View style={{ padding: 14, gap: 10 }}>
              {prop.reasons.map(r => (
                <View key={r.code} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <Icon name={r.code === 'perDay' && r.over ? 'alert' : 'check'} size={14} color={r.code === 'perDay' && r.over ? C.warningText : C.successText} stroke={2.6} />
                  <T w={500} s="label" lh={1.45} c={C.ink2} style={{ flex: 1 }}>{reasonLine(r, L, ar)}</T>
                </View>
              ))}
            </View>
          </Section>

          {!!req.replacesExamId && <T w={600} s="caption" c={C.ink3} style={{ textAlign: 'center' }}>{L.plReplaces.replace('{s}', req.subjectName)}</T>}
          <PrimaryBtn title={L.plApply} icon="check" onPress={() => {
            if (atExamLimit && !req.replacesExamId) { hitLimit(); return; }
            applyPlan(prop); router.dismissTo('/');
          }} />
        </>
      )}
    </Page>
  );
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function reasonLine(r: PlanReason, L: Copy, ar: boolean) {
  switch (r.code) {
    case 'start': return L.plR1.replace('{n}', String(r.days));
    case 'spacing': return L.plR2;
    case 'mock': return L.plR3;
    case 'perDay': return (r.over ? L.plR4over : L.plR4).replace('{m}', hours(r.minutes, ar)).replace('{c}', hours(r.capacity, ar));
    case 'around': return L.plR5.replace('{n}', String(r.items));
  }
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  const { C } = useNazzim();
  const btn = { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <View style={{ flex: 1, minWidth: 0, borderRadius: 12, backgroundColor: C.card2, padding: 10, gap: 6 }}>
      <T w={700} s="micro" c={C.ink3}>{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Btn label="−" onPress={onMinus} style={btn}><T f="grotesk" w={700} s="heading" c={C.ink2}>−</T></Btn>
        <T w={700} s="label" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>{value}</T>
        <Btn label="+" onPress={onPlus} style={btn}><T f="grotesk" w={700} s="heading" c={C.ink2}>+</T></Btn>
      </View>
    </View>
  );
}
