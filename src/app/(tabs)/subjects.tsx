import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { ProgressRing, SubjectTile } from '../../components/Academic';
import { Btn, Icon, T } from '../../components/ui';
import { summarizeSubject } from '../../engine/academic';
import { useAcademic } from '../../lib/academic';
import { useChrome } from '../../lib/layout';
import { useNazzim } from '../../lib/store';
import { swatch } from '../../lib/theme';
import { addDays } from '../../lib/exams';
import { relDay } from '../../lib/format';

// SUBJECTS: every course with its target grade and how far along the planned work is.
export default function Subjects() {
  const { C, L, ar, accent, subjects, scheme, today } = useNazzim();
  const { headerTop, scrollBottom } = useChrome();
  const { ctx } = useAcademic();

  return (
    <View style={{ flex: 1, direction: ar ? 'rtl' : 'ltr' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: headerTop, paddingHorizontal: 18, paddingBottom: scrollBottom, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <T f="display" w={700} s={26} ls={ar ? 0 : -0.8} style={{ flex: 1 }} accessibilityRole="header">{L.subjects}</T>
          <Btn label={L.addSubject} onPress={() => router.push('/subject/new')} pressScale={0.94}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: accent.tint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={18} color={accent.strong} stroke={2.6} />
          </Btn>
        </View>

        {subjects.map(s => {
          const sum = summarizeSubject(ctx, s);
          const sw = swatch(s.color, scheme);
          const soon = !!sum.nextExam && sum.nextExam.date <= addDays(today, 3);
          const fact = sum.nextExam ? L.subjExam.replace('{d}', relDay(sum.nextExam.date, today, L))
            : sum.pendingTasks ? (sum.pendingTasks === 1 ? L.subjTask1 : L.subjTasks.replace('{n}', String(sum.pendingTasks))) : L.subjClear;
          return (
            <Btn key={s.id} pressScale={0.99} onPress={() => router.push(`/subject/${s.id}`)}
              accessibilityLabel={`${s.name}, ${L.target.replace('{g}', s.targetGrade)}, ${sum.progress}%`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, boxShadow: C.shadowSoft }}>
              <SubjectTile subject={s} size={48} />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <T f="display" w={700} s={17} numberOfLines={1}>{s.name}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <View style={{ paddingVertical: 2, paddingHorizontal: 7, borderRadius: 6, backgroundColor: sw.tint }}>
                    <T f="grotesk" w={700} s={11} c={sw.fg}>{s.targetGrade}</T>
                  </View>
                  {/* The single most useful fact: the next exam, else what's open */}
                  <T w={600} s={12} c={soon ? C.warningText : C.ink3} numberOfLines={1} style={{ flexShrink: 1 }}>{fact}</T>
                </View>
              </View>
              <ProgressRing value={sum.progress} size={50} stroke={4.5} color={sw.fg} />
            </Btn>
          );
        })}

        {!subjects.length && (
          <Btn onPress={() => router.push('/subject/new')} style={{ padding: 20, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, alignItems: 'center', gap: 8 }}>
            <Icon name="books" size={24} color={accent.fg} />
            <T w={600} s={13.5} c={C.ink2} style={{ textAlign: 'center' }}>{L.noSubjects}</T>
            <T w={700} s={13.5} c={accent.fg}>{L.addSubject}</T>
          </Btn>
        )}
      </ScrollView>
    </View>
  );
}
