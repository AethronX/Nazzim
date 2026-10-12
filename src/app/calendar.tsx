import { useMemo } from 'react';
import { View } from 'react-native';
import { Page, Section } from '../components/Page';
import { EmptyState, T } from '../components/ui';
import { byDay, buildCalendar, DEFAULT_HORIZON, type CalEntry } from '../engine/calendar';
import { fmtDate, relDay } from '../lib/format';
import { useNazzim } from '../lib/store';

// CALENDAR: one timeline. Nothing is invented — an entry exists because a record exists, and an unconfirmed
// date says so rather than sitting next to syllabus dates as if it were equally certain.
export default function Calendar() {
  const { C, L, ar, today, assessments, exams, tasks, topics, errors, subjects } = useNazzim();
  const K = L.cal;

  const days = useMemo(
    () => byDay(buildCalendar({ today, assessments, exams, tasks, topics, errors })),
    [today, assessments, exams, tasks, topics, errors],
  );
  const nameOf = (id?: string) => subjects.find(s => s.id === id)?.name.split('—')[0].trim() ?? '';

  const tone = (k: CalEntry['kind']) =>
    k === 'exam' || k === 'assessment' ? { bg: C.dangerTint, fg: C.danger }
    : k === 'task' ? { bg: C.line2, fg: C.ink2 }
    : k === 'retest' ? { bg: C.warningTint, fg: C.warningText }
    : { bg: C.successTint, fg: C.successText };

  if (!days.length) {
    return <Page title={K.title} sub={K.sub}><EmptyState icon="calendar" title={K.emptyT} body={K.emptyS} /></Page>;
  }

  return (
    <Page title={K.title} sub={K.horizon.replace('{n}', String(DEFAULT_HORIZON))}>
      {days.map(({ date, items }) => (
        <Section key={date} label={`${relDay(date, today, L, ar)} · ${fmtDate(date, L)}`}>
          {items.map((e, i) => {
            const t = tone(e.kind);
            return (
              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: i === items.length - 1 ? 0 : 1, borderBottomColor: C.line2 }}>
                <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99, backgroundColor: t.bg }}>
                  <T w={700} s="micro" c={t.fg}>{K.kinds[e.kind]}</T>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <T w={700} s="label" numberOfLines={2}>{e.title}</T>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {!!nameOf(e.subjectId) && <T w={600} s="caption" c={C.ink3}>{nameOf(e.subjectId)}</T>}
                    {e.weight !== undefined && e.weight > 0 && <T w={600} s="caption" c={C.ink3}>· {K.worth.replace('{n}', String(e.weight))}</T>}
                    {e.unconfirmed && <T w={700} s="caption" c={C.warningText}>· {K.unconfirmed}</T>}
                  </View>
                </View>
              </View>
            );
          })}
        </Section>
      ))}
    </Page>
  );
}
