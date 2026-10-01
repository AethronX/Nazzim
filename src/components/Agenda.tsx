import { useState } from 'react';
import { View } from 'react-native';
import type { AgendaItem } from '../engine/academic';
import { useAcademic } from '../lib/academic';
import type { Confidence } from '../lib/exams';
import { useNazzim } from '../lib/store';
import { swatch } from '../lib/theme';
import { Btn, Icon, T } from './ui';

// The day as a timeline (time · rail · block). The first open block is "now" and is highlighted; tasks tick off
// directly; study sessions ask how it went (Hard / OK / Easy) so the engine adapts the next review.
// Exams sit above the rail as a banner: they are the day's anchor, not a block of work.
export function Timeline({ items }: { items: AgendaItem[] }) {
  const { C, L } = useNazzim();
  const exams = items.filter(i => i.kind === 'exam');
  const blocks = items.filter(i => i.kind !== 'exam');
  const nowKey = blocks.find(b => !b.done)?.key;
  return (
    <View style={{ gap: 8 }}>
      {exams.map(e => (
        <View key={e.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: C.warningTint }}>
          <Icon name="exam" size={16} color={C.warningText} stroke={2.2} />
          <T w={700} s="label" c={C.warningText} style={{ flex: 1 }}>{`${L.examToday} · ${e.title}`}</T>
        </View>
      ))}
      <View>
        {blocks.map((b, i) => <TimelineRow key={b.key} item={b} first={i === 0} last={i === blocks.length - 1} now={b.key === nowKey} />)}
      </View>
    </View>
  );
}

function TimelineRow({ item, first, last, now }: { item: AgendaItem; first: boolean; last: boolean; now: boolean }) {
  const { C, L, ar, accent, scheme, toggleTask, rateSession } = useNazzim();
  const { subjectById } = useAcademic();
  const [asking, setAsking] = useState(false);
  const subject = item.subjectId ? subjectById.get(item.subjectId) : undefined;
  const sw = subject ? swatch(subject.color, scheme) : { fg: accent.fg, tint: accent.tint };
  const onCheck = () => {
    if (item.kind === 'task') toggleTask(item.refId);
    else if (!item.done) setAsking(a => !a);
  };
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {/* Time column */}
      <View style={{ width: 46, alignItems: 'flex-end', paddingTop: 13 }}>
        <T num="data" w={700} s="label" c={item.done ? C.ink3 : C.ink}>{item.start ?? ''}</T>
        <T w={600} s="micro" c={C.ink3}>{`${item.minutes}${ar ? ' د' : 'm'}`}</T>
      </View>
      {/* Rail + node (the node is the checkbox) */}
      <View style={{ width: 26, alignItems: 'center' }}>
        <View style={{ width: 2, height: 12, backgroundColor: first ? 'transparent' : C.line }} />
        <Btn label={L.markDoneA} accessibilityRole="checkbox" accessibilityState={{ checked: item.done }} onPress={onCheck} pressScale={0.9}
          style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: item.done ? 0 : 2, borderColor: now ? accent.fg : sw.fg, backgroundColor: item.done ? C.success : C.card }}>
          {item.done && <Icon name="check" size={13} color={C.onSuccess} stroke={3.4} />}
        </Btn>
        <View style={{ width: 2, flex: 1, backgroundColor: last ? 'transparent' : C.line }} />
      </View>
      {/* Block */}
      <View style={{ flex: 1, minWidth: 0, marginBottom: last ? 0 : 10 }}>
        <View style={{ padding: 12, borderRadius: 16, borderWidth: now ? 1.5 : 1, borderColor: now ? accent.a1 : C.line, backgroundColor: now ? accent.tint : C.card, opacity: item.done ? 0.6 : 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sw.fg }} />
            <T w={600} s="caption" c={C.ink3} numberOfLines={1} style={{ flex: 1 }}>
              {[subject?.name, item.kind === 'task' ? L.kTaskB : item.detail.split(' · ').pop()].filter(Boolean).join(' · ')}
            </T>
            {now && <T w={800} s="micro" ls={ar ? 0 : 0.8} c={accent.strong}>{L.nowL}</T>}
          </View>
          <T w={700} s="label" numberOfLines={2} style={item.done ? { textDecorationLine: 'line-through', color: C.ink3 } : undefined}>{item.title}</T>
        </View>
        {asking && !item.done && (
          <View style={{ gap: 8, paddingTop: 10 }}>
            <T w={600} s="caption" c={C.ink2}>{L.rateQ}</T>
            <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="radiogroup">
              {([1, 2, 3] as Confidence[]).map(c => (
                <Btn key={c} accessibilityRole="radio" onPress={() => { setAsking(false); rateSession(item.refId, c); }} pressedBg={accent.tint2}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: c === 3 ? accent.a1 : C.line, backgroundColor: C.card }}>
                  <T w={700} s="label" c={c === 3 ? accent.fg : C.ink}>{L.rates[c - 1]}</T>
                </Btn>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
