import { router } from 'expo-router';
import { View } from 'react-native';
import { useNazzim } from '../lib/store';
import { Sheet } from './Sheet';
import { Btn, Icon, T, type IconName } from './ui';

// One "+" for everything a student adds: a task, an exam (planned automatically) or a subject.
export function QuickAdd() {
  const { C, L, ar, accent, setQuick } = useNazzim();
  const go = (path: '/task/new' | '/planner' | '/subject/new') => { setQuick(false); router.push(path); };
  const rows: { icon: IconName; title: string; sub: string; path: '/task/new' | '/planner' | '/subject/new' }[] = [
    { icon: 'check', title: L.qaTask, sub: L.qaTaskSub, path: '/task/new' },
    { icon: 'exam', title: L.qaExam, sub: L.qaExamSub, path: '/planner' },
    { icon: 'books', title: L.qaSubject, sub: L.qaSubjectSub, path: '/subject/new' },
  ];
  return (
    <Sheet onClose={() => setQuick(false)} maxHeight="70%" z={60}>
      <T f="display" w={700} s={20} ls={ar ? 0 : -0.4}>{L.qaTitle}</T>
      <View style={{ gap: 8 }}>
        {rows.map(r => (
          <Btn key={r.path} onPress={() => go(r.path)} pressScale={0.99}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: accent.tint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={r.icon} size={19} color={accent.fg} stroke={2.2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T w={700} s={14.5}>{r.title}</T>
              <T w={500} s={12} c={C.ink3} style={{ marginTop: 1 }}>{r.sub}</T>
            </View>
            <Icon name="chevron" size={15} color={C.ink3} flip={ar} />
          </Btn>
        ))}
      </View>
    </Sheet>
  );
}
