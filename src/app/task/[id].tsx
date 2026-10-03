import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Page } from '../../components/Page';
import { TaskForm } from '../../components/TaskForm';
import { Button, T, type ButtonVariant, type IconName } from '../../components/ui';
import { canMoveToTomorrow } from '../../engine/tasks';
import { fmtDate } from '../../lib/format';
import { useNazzim } from '../../lib/store';

// Edit a task: everything about it can change, and the three things students do most to a task that is
// not going as planned — finish it, push it to tomorrow, drop it — are one tap each.
export default function EditTask() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { C, L, today, tasks, updateTask, moveTaskTomorrow, deleteTask, award, startFocusOn } = useNazzim();
  const [confirm, setConfirm] = useState(false);
  const task = tasks.find(t => t.id === id);
  if (!task) return <Page title={L.tkEdit}><T c={C.ink3}>{L.exNone}</T></Page>;

  const canMove = canMoveToTomorrow(task, today);
  const action = (icon: IconName, label: string, onPress: () => void, variant: ButtonVariant = 'tertiary') => (
    <Button key={label} icon={icon} title={label} onPress={onPress} variant={variant} align="start" />
  );

  return (
    <Page title={L.tkEdit} sub={task.done ? L.tkGroups.done : undefined}>
      <TaskForm submitLabel={L.tkSave}
        initial={{ title: task.title, subjectId: task.subjectId, due: task.due, estimateMin: task.estimateMin, priority: task.priority ?? 'normal', notes: task.notes ?? '' }}
        onSubmit={d => {
          const ok = updateTask(task.id, {
            title: d.title, subjectId: d.subjectId, due: d.due, estimateMin: d.estimateMin,
            priority: d.priority === 'normal' ? undefined : d.priority, notes: d.notes || undefined,
            // A new deadline earlier than the planned working day pulls the working day back with it.
            ...(task.plannedFor && task.plannedFor > d.due ? { plannedFor: undefined } : {}),
          });
          award(0, ok ? L.tkSavedT : L.tkInvalid);
          if (ok) router.back();
        }}>
        <View style={{ gap: 8, marginTop: 6 }}>
          {!task.done && action('play', L.startSession, () => startFocusOn(task.title, { kind: 'task', id: task.id }, task.estimateMin), 'secondary')}
          {action('check', task.done ? L.tkMarkOpen : L.tkMarkDone, () => { updateTask(task.id, { done: !task.done }); router.back(); })}
          {canMove && (
            <View style={{ gap: 4 }}>
              {action('reset', L.tkMoveTomorrow, () => { moveTaskTomorrow(task.id); award(0, L.tkMovedT.replace('{d}', fmtDate(task.due, L))); router.back(); })}
              <T w={500} s="caption" c={C.ink3} style={{ paddingHorizontal: 6 }}>{L.tkMoveNote.replace('{d}', fmtDate(task.due, L))}</T>
            </View>
          )}
          {action('trash', confirm ? L.tkDeleteConfirm : L.tkDelete, () => {
            if (!confirm) { setConfirm(true); return; }
            deleteTask(task.id); router.back();
          }, 'destructive')}
        </View>
      </TaskForm>
    </Page>
  );
}
