import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { Page, Row, Section } from '../components/Page';
import { Btn, Icon, PrimaryBtn, T } from '../components/ui';
import { useNazzim } from '../lib/store';
import { font } from '../lib/theme';
import { syncAvailable, type AuthError } from '../services/sync';

// ACCOUNT: optional. Signed out, Nazzim works fully on this device; an account adds sync and backup.
export default function Account() {
  const { C, L, ar, accent, account, syncState, lastSync, signIn, signUp, signOut, syncNow, setDel } = useNazzim();
  const [mode, setMode] = useState<'signIn' | 'create'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  // "Synced 2 min ago" stays current without reading the clock during render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 8;
  const input = { fontFamily: font('body', 600, ar), fontSize: 15.5, color: C.ink, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, textAlign: ar ? 'right' : 'left' } as const;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true); setError(null);
    const r = mode === 'signIn' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    if ('needsConfirm' in r && r.needsConfirm) { setConfirmSent(true); setMode('signIn'); setPassword(''); return; }
    router.replace('/');
  };

  if (account) {
    const ago = lastSync ? Math.max(0, Math.round((now - lastSync) / 60000)) : null;
    const status = syncState === 'syncing' ? L.acSyncing : syncState === 'error' ? L.acSyncError
      : ago === null ? L.acNever : L.acSynced.replace('{t}', ago < 1 ? L.acJustNow : L.acMinAgo.replace('{n}', String(ago)));
    return (
      <Page title={L.acTitle}>
        <Section label={L.acSignedIn}>
          <Row icon="user" title={account.email} />
          <Row icon={syncState === 'error' ? 'alert' : 'check'} title={status} last
            right={syncState === 'syncing' ? <ActivityIndicator color={accent.fg} /> : (
              <Btn onPress={syncNow} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: accent.tint }}>
                <T w={700} s={12} c={accent.strong}>{L.acSyncNow}</T>
              </Btn>
            )} />
        </Section>
        <Section>
          <Row icon="arrow" title={L.acSignOut} onPress={() => { signOut(); router.back(); }} chevron={false} />
          <Row icon="trash" title={L.deleteAcc} danger last onPress={() => setDel(true)} chevron={false} />
        </Section>
      </Page>
    );
  }

  return (
    <Page title={mode === 'signIn' ? L.acSignIn : L.acCreate} sub={L.acSub}>
      <View style={{ gap: 8, paddingVertical: 4 }}>
        {L.acBenefits.map(b => (
          <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="check" size={15} color={C.successText} stroke={2.6} />
            <T w={600} s={13.5} c={C.ink2}>{b}</T>
          </View>
        ))}
      </View>

      {confirmSent && (
        <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: accent.tint }}>
          <Icon name="bell" size={16} color={accent.strong} />
          <T w={600} s={13} lh={1.45} c={accent.strong} style={{ flex: 1 }}>{L.acConfirm}</T>
        </View>
      )}

      <View style={{ gap: 10 }}>
        <TextInput value={email} onChangeText={setEmail} placeholder={L.acEmail} placeholderTextColor={C.ink3} style={input}
          autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" accessibilityLabel={L.acEmail} />
        <TextInput value={password} onChangeText={setPassword} placeholder={L.acPassword} placeholderTextColor={C.ink3} style={input}
          secureTextEntry autoCapitalize="none" textContentType={mode === 'create' ? 'newPassword' : 'password'}
          onSubmitEditing={submit} returnKeyType="go" accessibilityLabel={L.acPassword} />
      </View>
      {!!error && <T w={600} s={13} c={C.danger} accessibilityLiveRegion="polite">{L.acErr[error]}</T>}
      {!syncAvailable && <T w={600} s={13} c={C.ink3}>{L.acErr.unavailable}</T>}

      <PrimaryBtn title={busy ? '…' : mode === 'signIn' ? L.acSignIn : L.acCreate} disabled={!valid || busy || !syncAvailable} onPress={submit} />
      <Btn onPress={() => { setMode(m => (m === 'signIn' ? 'create' : 'signIn')); setError(null); }} style={{ padding: 10, alignItems: 'center' }}>
        <T w={700} s={13.5} c={accent.fg}>{mode === 'signIn' ? L.acToCreate : L.acToSignIn}</T>
      </Btn>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="lock" size={13} color={C.ink3} />
        <T w={500} s={12} c={C.ink3}>{L.acLocalNote}</T>
      </View>
    </Page>
  );
}
