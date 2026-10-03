import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { SubjectTile } from '../components/Academic';
import { Choice, Page, Section } from '../components/Page';
import { Btn, EmptyState, Icon, T } from '../components/ui';
import { GROUP_ORDER, rankTasks, type RankedTask, type TaskSort } from '../engine/tasks';
import { useAcademic } from '../lib/academic';
import { relDay } from '../lib/format';
import { useNazzim } from '../lib/store';

// TASKS: every task in one list, in the order that deserves attention. Each row carries the one phrase that
// explains its place, so the order can be checked rather than taken on trust. Tapping a row opens it for
// editing; the circle ticks it off.
export default function Tasks() {
  const { C, L, ar, accent, today, tasks, exams, toggleTask } = useNazzim();
  const { subjectById } = useAcademic();
  const [sort, setSort] = useState<TaskSort>('smart');
  const [showDone, setShowDone] = useState(false);

  const ranked = useMemo(() => rankTasks(tasks, exams, today, sort), [tasks, exams, today, sort]);
  const open = ranked.filter(r => r.group !== 'done').length;
  const groups = GROUP_ORDER
    .filter(g => g !== 'done' || showDone)
    .map(g => ({ g, rows: ranked.filter(r => r.group === g) }))
    .filter(x => x.rows.length);

  const meta = (r: RankedTask) => {
    const due = r.dueIn === -1 ? L.rOverdue1 : r.dueIn < 0 ? L.rOverdue.replace('{n}', String(-r.dueIn)) : relDay(r.task.due, today, L, ar);
    return `${due} · ${r.task.estimateMin} ${L.min}`;
  };

  return (
    <Page title={L.tasksTitle} sub={open ? L.tkOpenN.replace('{n}', String(open)) : undefined}>
      <Btn onPress={() => router.push('/task/new')} pressScale={0.99} accessibilityLabel={L.addTask}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, padding: 14, borderRadius: 16, backgroundColor: accent.tint }}>
        <Icon name="plus" size={18} color={accent.strong} stroke={2.6} />
        <T w={700} s="label" c={accent.strong} style={{ flex: 1 }}>{L.tkQuickPh}</T>
      </Btn>

      {!!tasks.length && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Choice options={['smart', 'due'] as const} value={sort} onChange={setSort} labels={[L.tkSmart, L.tkByDue]} />
            </View>
            <Btn onPress={() => setShowDone(v => !v)} accessibilityRole="switch" accessibilityState={{ checked: showDone }}
              style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 99, borderWidth: 1, borderColor: C.line }}>
              <T w={700} s="caption" c={C.ink2}>{showDone ? L.tkHideDone : L.tkShowDone}</T>
            </Btn>
          </View>
          {sort === 'smart' && <T w={500} s="caption" lh={1.55} c={C.ink3}>{L.tkSmartWhy}</T>}
        </View>
      )}

      {!tasks.length && <EmptyState icon="check" title={L.tkEmptyT} body={L.tkEmptyS} />}

      {groups.map(({ g, rows }) => (
        <Section key={g} label={`${L.tkGroups[g]} · ${rows.length}`}>
          {rows.map((r, i) => {
            const t = r.task;
            const subject = t.subjectId ? subjectById.get(t.subjectId) : undefined;
            const why = sort === 'smart' ? L.tkWhy[r.reason] : '';
            const late = r.group === 'overdue';
            return (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: C.line2, opacity: t.done ? 0.6 : 1 }}>
                <Btn label={t.done ? L.tkMarkOpen : L.tkMarkDone} accessibilityRole="checkbox" accessibilityState={{ checked: t.done }} onPress={() => toggleTask(t.id)} pressScale={0.9}
                  style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: t.done ? 0 : 2, borderColor: late ? C.warningText : C.control, backgroundColor: t.done ? C.success : 'transparent' }}>
                  {t.done && <Icon name="check" size={13} color={C.onSuccess} stroke={3.4} />}
                </Btn>
                <Btn onPress={() => router.push(`/task/${t.id}`)} pressScale={0.99} accessibilityLabel={`${t.title}, ${meta(r)}${why ? ', ' + why : ''}`}
                  style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {t.priority === 'high' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent.fg }} />}
                      <T w={700} s="label" numberOfLines={2} style={[{ flexShrink: 1 }, t.done ? { textDecorationLine: 'line-through', color: C.ink3 } : null]}>{t.title}</T>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      {!!subject && <T w={600} s="caption" c={C.ink3}>{subject.name} ·</T>}
                      <T w={600} s="caption" c={late ? C.warningText : C.ink3}>{meta(r)}</T>
                      {!!why && (
                        <View style={{ paddingVertical: 1, paddingHorizontal: 8, borderRadius: 99, backgroundColor: late ? C.warningTint : C.line2 }}>
                          <T w={700} s="micro" c={late ? C.warningText : C.ink2}>{why}</T>
                        </View>
                      )}
                    </View>
                  </View>
                  {!!subject && <SubjectTile subject={subject} size={28} />}
                </Btn>
              </View>
            );
          })}
        </Section>
      ))}
    </Page>
  );
}
