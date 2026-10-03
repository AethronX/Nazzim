import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Connectivity, without a new native dependency. The app is local-first — nothing a student does needs the
// network — so this only drives a calm notice. The browser reports it directly; on iOS/Android there is no
// built-in signal without adding a package, so native reports "online" and the notice simply never shows.
export function useOnline(): boolean {
  const web = Platform.OS === 'web' && typeof window !== 'undefined' && typeof navigator !== 'undefined';
  const [online, setOnline] = useState(() => (web ? navigator.onLine !== false : true));
  useEffect(() => {
    if (!web) return;
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, [web]);
  return online;
}
