import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { readiness, type Confidence, type ExamItem, type StudySession } from '../lib/exams';
import { fmtDate, relDay } from '../lib/format';
import { useNazzim } from '../lib/store';
import { Btn, Icon, T } from './ui';

export function sessionTitle(s: StudySession, exam: ExamItem | undefined, allLabel: string) {
  return s.chapter < 0 ? allLabel : exam?.chapters[s.chapter] ?? '';
}

// One revision session: kind, chapter, exam, minutes. Start opens the focus timer on it; Done asks for a
// Hard / OK / Easy rating, which the engine uses to schedule the next review.
export function SessionRow({ s, exam, last, showExam = true }: { s: StudySession; exam?: ExamItem; last?: boolean; showExam?: boolean }) {
  const { C, L, ar, accent, startFocusOn, rateSession } = useNazzim();
  const [asking, setAsking] = useState(false);
  const title = sessionTitle(s, exam, L.exAll);
  const kind = { learn: L.kLearn, review: L.kReview, mock: L.kMock }[s.kind];
  const confLabel = s.confidence ? L.rates[s.confidence - 1] : '';
  return (
    <View style={{ paddingVertical: 13, paddingHorizontal: 15, gap: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line2, opacity: s.done ? 0.6 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* Ring = focus-type item, filled when done (same shape language as the Today timeline) */}
        <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: accent.a1, backgroundColor: s.done ? accent.a1 : C.card }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T w={800} s={9.5} ls={ar ? 0 : 0.6} c={s.kind === 'mock' ? C.ink2 : accent.fg} style={{ textTransform: 'uppercase' }}>{kind}</T>
            <T f="grotesk" w={700} s={10.5} c={C.ink3}>{`${s.minutes} ${L.min}`}</T>
          </View>
          <T w={700} s={14} c={s.done ? C.ink3 : C.ink} style={[{ marginTop: 2 }, s.done && { textDecorationLine: 'line-through' }]} numberOfLines={1}>{title}</T>
          {showExam && !!exam && <T w={600} s={11} c={C.ink3} style={{ marginTop: 1 }}>{exam.subject}</T>}
        </View>
        {s.done ? (
          <View style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 99, backgroundColor: accent.tint }}>
            <T w={700} s={11} c={accent.strong}>{confLabel || L.doneS}</T>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Btn label={`${L.startS} · ${title}`} onPress={() => startFocusOn(`${title} · ${exam?.subject ?? ''}`, { kind: 'session', id: s.id }, s.minutes)}
              style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="play" size={13} color={accent.fg} />
            </Btn>
            <Btn onPress={() => setAsking(a => !a)} accessibilityState={{ expanded: asking }}
              style={{ paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: asking ? C.inv : C.line2, alignItems: 'center', justifyContent: 'center' }}>
              <T w={700} s={12} c={asking ? C.onInv : C.ink2}>{L.doneS}</T>
            </Btn>
          </View>
        )}
      </View>
      {asking && !s.done && (
        <View style={{ gap: 8, paddingStart: 26 }}>
          <T w={600} s={12} c={C.ink2}>{L.rateQ}</T>
          <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="radiogroup">
            {([1, 2, 3] as Confidence[]).map(c => (
              <Btn key={c} accessibilityRole="radio" onPress={() => { setAsking(false); rateSession(s.id, c); }}
                pressedBg={accent.tint2}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: c === 3 ? accent.a1 : C.line, backgroundColor: C.card }}>
                <T w={700} s={13} c={c === 3 ? accent.fg : C.ink}>{L.rates[c - 1]}</T>
              </Btn>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// Exam summary: subject, date, countdown, readiness. The nearest exam uses the midnight hero surface.
export function ExamCard({ exam, hero }: { exam: ExamItem; hero?: boolean }) {
  const { C, L, ar, accent, study, today } = useNazzim();
  const ready = readiness(exam, study);
  const left = study.filter(s => s.examId === exam.id && !s.done).length;
  const ink = hero ? C.onHero : C.ink, ink2 = hero ? C.onHero2 : C.ink3;
  return (
    <Btn pressScale={0.99} onPress={() => router.push(`/exam/${exam.id}`)}
      accessibilityLabel={`${exam.subject}, ${fmtDate(exam.date, L)}, ${L.exReady} ${ready}%`}
      style={{ padding: 16, borderRadius: 20, gap: 12, backgroundColor: hero ? C.hero : C.card, borderWidth: hero ? 0 : 1, borderColor: C.line, boxShadow: hero ? C.shadowHero : undefined }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T f="display" w={700} s={19} ls={ar ? 0 : -0.4} c={ink} numberOfLines={1}>{exam.subject}</T>
          <T w={600} s={12} c={ink2} style={{ marginTop: 2 }}>{`${fmtDate(exam.date, L)} · ${relDay(exam.date, today, L)}`}</T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T f="grotesk" w={700} s={30} ls={-1.2} lh={1} c={hero ? C.onHeroAccent : accent.fg}>{`${ready}%`}</T>
          <T w={800} s={9.5} ls={ar ? 0 : 0.8} c={ink2} style={{ marginTop: 3 }}>{L.exReady}</T>
        </View>
      </View>
      <View style={{ height: 5, borderRadius: 99, backgroundColor: hero ? C.onHeroTrack : accent.tint, overflow: 'hidden' }}>
        <View style={{ width: `${ready}%`, height: '100%', borderRadius: 99, backgroundColor: hero ? C.onHeroAccent : accent.fg }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <T w={600} s={11.5} c={ink2} style={{ flex: 1 }}>{L.exChaptersN.replace('{n}', String(exam.chapters.length))}</T>
        <T w={700} s={11.5} c={ink2}>{L.exLeft.replace('{n}', String(left))}</T>
        <Icon name="chevron" size={13} color={ink2} stroke={2.4} flip={ar} />
      </View>
    </Btn>
  );
}
