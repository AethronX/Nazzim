import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { ProgressRing, SubjectTile } from '../../components/Academic';
import { Btn, Icon, T } from '../../components/ui';
import { summarizeSubject } from '../../engine/academic';
import { useAcademic } from '../../lib/academic';
import { counted } from '../../lib/copy';
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
          <T f="display" w={700} s="display" ls={ar ? 0 : -0.8} style={{ flex: 1 }} accessibilityRole="header">{L.subjects}</T>
          <Btn label={L.addSubject} onPress={() => router.push('/subject/new')} pressScale={0.94}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: accent.tint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={18} color={accent.strong} stroke={2.6} />
          </Btn>
        </View>

        {subjects.map(s => {
          const sum = summarizeSubject(ctx, s);
          const sw = swatch(s.color, scheme);
          const soon = !!sum.nextExam && sum.nextExam.date <= addDays(today, 3);
          const fact = sum.nextExam ? L.subjExam.replace('{d}', relDay(sum.nextExam.date, today, L, ar))
            : sum.pendingTasks ? L.subjTasks.replace('{c}', counted(sum.pendingTasks, 'task', L, ar)) : L.subjClear;
          return (
            <Btn key={s.id} pressScale={0.99} onPress={() => router.push(`/subject/${s.id}`)}
              accessibilityLabel={`${s.name}, ${L.target.replace('{g}', s.targetGrade)}, ${sum.readiness === undefined ? L.sbDone : L.sbReady} ${sum.readiness ?? sum.progress}%`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, boxShadow: C.shadowSoft }}>
              <SubjectTile subject={s} size={48} />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <T f="display" w={700} s="heading" numberOfLines={1}>{s.name}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <View style={{ paddingVertical: 2, paddingHorizontal: 7, borderRadius: 6, backgroundColor: sw.tint }}>
                    <T f="grotesk" w={700} s="caption" c={sw.fg}>{s.targetGrade}</T>
                  </View>
                  {/* The single most useful fact: the next exam, else what's open */}
                  <T w={600} s="caption" c={soon ? C.warningText : C.ink3} numberOfLines={1} style={{ flexShrink: 1 }}>{fact}</T>
                </View>
                {!sum.nextExam && !sum.pendingTasks && (
                  <Btn label={L.exAdd} onPress={() => router.push(`/exam/new?subject=${s.id}`)} pressScale={0.96}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 2 }}>
                    <Icon name="plus" size={12} color={accent.fg} stroke={2.6} />
                    <T w={700} s="caption" c={accent.fg}>{L.exAdd}</T>
                  </Btn>
                )}
              </View>
              <View style={{ alignItems: 'center', gap: 3 }}>
                <ProgressRing value={sum.readiness ?? sum.progress} size={50} stroke={4.5} color={sw.fg} />
                <T w={600} s="micro" c={C.ink3}>{sum.readiness === undefined ? L.sbDone : L.sbReady}</T>
              </View>
            </Btn>
          );
        })}

        {!subjects.length && (
          <Btn onPress={() => router.push('/subject/new')} style={{ padding: 20, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, alignItems: 'center', gap: 8 }}>
            <Icon name="books" size={24} color={accent.fg} />
            <T w={600} s="label" c={C.ink2} style={{ textAlign: 'center' }}>{L.noSubjects}</T>
            <T w={700} s="label" c={accent.fg}>{L.addSubject}</T>
          </Btn>
        )}
      </ScrollView>
    </View>
  );
}
