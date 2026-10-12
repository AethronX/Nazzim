import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Page, Section } from '../components/Page';
import { Button, Notice, PrimaryBtn, T } from '../components/ui';
import { useNazzim } from '../lib/store';
import { font, TEXT } from '../lib/theme';

// BACKUP: the student's academic record, in text they can keep anywhere. No clipboard dependency — the
// export is shown in a selectable field, which works on every platform and adds nothing to the bundle.
// Restoring replaces data, so it warns first and refuses anything that is not unmistakably a Nazzim backup.
export default function Backup() {
  const { C, L, ar, exportData, importData, award } = useNazzim();
  const X = L.ex;
  const [dump, setDump] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [status, setStatus] = useState<'idle' | 'ok' | 'bad'>('idle');

  const mono = {
    fontFamily: font('body', 500, ar), fontSize: TEXT.caption, color: C.ink, minHeight: 140, padding: 12,
    borderWidth: 1, borderColor: C.line, borderRadius: 12, textAlign: ar ? 'right' : 'left',
  } as const;

  const restore = () => {
    const r = importData(paste);
    setStatus(r.ok ? 'ok' : 'bad');
    if (r.ok) { setPaste(''); award(0, X.importOk); }
  };

  return (
    <Page title={X.title} sub={X.sub}>
      <Button title={X.export} icon="doc" onPress={() => setDump(exportData())} />

      {dump !== null && (
        <Section label={X.export}>
          <View style={{ padding: 14, gap: 8 }}>
            <T w={500} s="caption" c={C.ink3}>{X.counts.replace('{n}', String(dump.length))}</T>
            {/* Selectable, not editable: select all and copy it wherever you keep your backups. */}
            <TextInput value={dump} editable={false} multiline textAlignVertical="top" accessibilityLabel={X.export} style={mono} />
          </View>
        </Section>
      )}

      <Section label={X.importT}>
        <View style={{ padding: 14, gap: 10 }}>
          <Notice tone="caution" body={X.warn} />
          <TextInput value={paste} onChangeText={t => { setPaste(t); setStatus('idle'); }} placeholder={X.importPh}
            placeholderTextColor={C.ink3} multiline textAlignVertical="top" accessibilityLabel={X.importPh} style={mono} />
          {status === 'bad' && <T w={700} s="caption" c={C.danger}>{X.importBad}</T>}
          {status === 'ok' && <T w={700} s="caption" c={C.successText}>{X.importOk}</T>}
          <PrimaryBtn title={X.importDo} onPress={restore} disabled={!paste.trim()} />
        </View>
      </Section>
    </Page>
  );
}
