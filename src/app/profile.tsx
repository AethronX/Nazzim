import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Avatar, Page, Row, Section } from '../components/Page';
import { Btn, Button, Icon, T } from '../components/ui';
import { summarizeProgress } from '../engine/insights';
import { hours, useAcademic } from '../lib/academic';
import { useNazzim, type Profile as ProfileData } from '../lib/store';
import { font, TEXT } from '../lib/theme';

const FIELDS: { key: keyof ProfileData; label: 'fName' | 'fUni' | 'fMajor' | 'fYear' }[] = [
  { key: 'name', label: 'fName' }, { key: 'uni', label: 'fUni' }, { key: 'major', label: 'fMajor' }, { key: 'year', label: 'fYear' },
];

export default function Profile() {
  const { C, L, ar, accent, me, profile, saveProfile, level, gamification, focusLog } = useNazzim();
  const { ctx } = useAcademic();
  const stats = summarizeProgress(ctx, focusLog);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileData>(profile);

  const startEdit = () => { setDraft({ name: me.name, uni: me.uni, major: me.major, year: me.year }); setEditing(true); };
  const save = () => { saveProfile(draft); setEditing(false); };

  return (
    <Page title={L.profile}>
      {/* Identity */}
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 10 }}>
        <Avatar name={editing ? draft.name || me.name : me.name} size={88} />
        {!editing && (
          <View style={{ alignItems: 'center', gap: 3 }}>
            <T f="display" w={700} s="display" ls={ar ? 0 : -0.6}>{me.name || L.noName}</T>
            <T w={600} s="label" c={C.ink2} style={{ textAlign: 'center' }}>{[me.major, me.year].filter(Boolean).join(' · ')}</T>
            <T w={600} s="caption" c={C.ink3} style={{ textAlign: 'center' }}>{me.uni}</T>
          </View>
        )}
        {!editing && (
          <Btn onPress={startEdit} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, marginTop: 4 }}>
            <Icon name="pencil" size={14} color={C.ink2} />
            <T w={700} s="caption" c={C.ink2}>{L.editProfile}</T>
          </Btn>
        )}
      </View>

      {editing && (
        <Section>
          {FIELDS.map((f, i) => (
            <View key={f.key} style={{ paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: i === FIELDS.length - 1 ? 0 : 1, borderBottomColor: C.line2, gap: 2 }}>
              <T w={700} s="micro" ls={ar ? 0 : 0.6} c={C.ink3}>{L[f.label]}</T>
              <TextInput
                value={draft[f.key]}
                onChangeText={v => setDraft(d => ({ ...d, [f.key]: v }))}
                placeholder={L[f.label]}
                placeholderTextColor={C.ink3}
                returnKeyType={i === FIELDS.length - 1 ? 'done' : 'next'}
                autoCapitalize="words"
                style={{ fontFamily: font('body', 600, ar), fontSize: TEXT.body, color: C.ink, paddingVertical: 4, textAlign: ar ? 'right' : 'left' }}
              />
            </View>
          ))}
        </Section>
      )}
      {editing && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Button variant="tertiary" title={L.cancel} onPress={() => setEditing(false)} /></View>
          <View style={{ flex: 1 }}><Button title={L.saveProfile} onPress={save} /></View>
        </View>
      )}

      {/* Stats */}
      {!editing && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {([
            gamification ? [String(level), L.level.charAt(0) + L.level.slice(1).toLowerCase(), accent.fg] : null,
            [`${stats.activeDays}/7`, L.prActiveDays, C.ink],
            [hours(stats.weekMinutes, ar), L.prWeek, C.ink],
          ].filter(Boolean) as [string, string, string][]).map(([v, label, color]) => (
            <View key={label} style={{ flex: 1, minWidth: 0, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center' }}>
              <T w={700} s="title" ls={-0.6} c={color}>{v}</T>
              <T w={700} s="micro" c={C.ink3} numberOfLines={1} style={{ marginTop: 3, textAlign: 'center' }}>{label}</T>
            </View>
          ))}
        </View>
      )}

      {!editing && (
        <Section>
          <Row icon="gear" title={L.settings} onPress={() => router.push('/settings')} />
          <Row icon="chart" title={L.progressMenu} onPress={() => router.push('/progress')} last />
        </Section>
      )}
    </Page>
  );
}
