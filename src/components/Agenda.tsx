import { useState } from 'react';
import { View } from 'react-native';
import type { AgendaItem } from '../engine/academic';
import { useAcademic } from '../lib/academic';
import type { Confidence } from '../lib/exams';
import { useNazzim } from '../lib/store';
import { KindBadge, SubjectTile } from './Academic';
import { Btn, Icon, T } from './ui';

// One block of the day. Tasks tick off directly; study sessions ask how it went (Hard / OK / Easy) so the
// engine can adapt the next review.
export function AgendaRow({ item, last }: { item: AgendaItem; last: boolean }) {
  const { C, L, ar, accent, toggleTask, rateSession } = useNazzim();
  const { subjectById } = useAcademic();
  const [asking, setAsking] = useState(false);
  const subject = item.subjectId ? subjectById.get(item.subjectId) : undefined;
  const onCheck = () => {
    if (item.kind === 'task') toggleTask(item.refId);
    else if (item.kind === 'session' && !item.done) setAsking(a => !a);
  };
  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 15, opacity: item.done ? 0.55 : 1 }}>
        <SubjectTile subject={subject} size={34} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T w={700} s={14} numberOfLines={1} style={[{ flexShrink: 1 }, item.done && { textDecorationLine: 'line-through', color: C.ink3 }]}>{item.title}</T>
          </View>
          <T w={600} s={11.5} c={C.ink3} style={{ marginTop: 2 }} numberOfLines={1}>
            {item.start ? `${item.start} – ${item.end} · ` : ''}{item.kind === 'exam' ? (subject?.name ?? '') : item.detail}
          </T>
        </View>
        <KindBadge kind={item.kind} />
        {item.kind !== 'exam' && (
          <Btn label={L.markDoneA} accessibilityRole="checkbox" accessibilityState={{ checked: item.done }} onPress={onCheck} pressScale={0.9}
            style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: item.done ? 0 : 2, borderColor: C.control, backgroundColor: item.done ? C.success : 'transparent' }}>
            {item.done && <Icon name="check" size={13} color={C.onSuccess} stroke={3.4} />}
          </Btn>
        )}
      </View>
      {asking && !item.done && (
        <View style={{ gap: 8, paddingHorizontal: 15, paddingBottom: 14, paddingStart: 61 }}>
          <T w={600} s={12} c={C.ink2}>{L.rateQ}</T>
          <View style={{ flexDirection: 'row', gap: 6, direction: ar ? 'rtl' : 'ltr' }} accessibilityRole="radiogroup">
            {([1, 2, 3] as Confidence[]).map(c => (
              <Btn key={c} accessibilityRole="radio" onPress={() => { setAsking(false); rateSession(item.refId, c); }} pressedBg={accent.tint2}
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
