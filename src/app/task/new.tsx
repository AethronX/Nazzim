import { router, useLocalSearchParams } from 'expo-router';
import { Page } from '../../components/Page';
import { TaskForm } from '../../components/TaskForm';
import { addDays } from '../../lib/exams';
import { useNazzim } from '../../lib/store';

// Add a task in one line. "مقال الإحصاء غداً 45 د" fills in the date, the time and the subject; every field
// below stays editable, and anything set by hand wins over what the line says.
export default function NewTask() {
  const { subject: preset } = useLocalSearchParams<{ subject?: string }>();
  const { L, today, addTask, award } = useNazzim();
  return (
    <Page title={L.addTask}>
      <TaskForm smart submitLabel={L.create}
        initial={{ title: '', subjectId: preset, due: addDays(today, 1), estimateMin: 30, priority: 'normal', notes: '' }}
        onSubmit={d => {
          const id = addTask({ title: d.title, subjectId: d.subjectId, due: d.due, estimateMin: d.estimateMin, priority: d.priority === 'normal' ? undefined : d.priority, notes: d.notes || undefined });
          if (!id) { award(0, L.tkInvalid); return; }
          router.back();
        }} />
    </Page>
  );
}
