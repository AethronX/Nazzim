// Live countdown for the focus timer. One shared 250 ms ticker, subscribed to only by the components that show
// the clock (Focus screen, mini timer), so a running session never re-renders the rest of the app.
import { useSyncExternalStore } from 'react';
import { useNazzim } from './store';

const listeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!ticker) ticker = setInterval(() => listeners.forEach(l => l()), 250);
  return () => {
    listeners.delete(cb);
    if (!listeners.size && ticker) { clearInterval(ticker); ticker = null; }
  };
}

// Seconds left: live while running, frozen while paused. Whole seconds, so React skips re-renders between ticks.
export function useTimerSecs(): number {
  const { timer } = useNazzim();
  return useSyncExternalStore(
    subscribe,
    () => (timer.running ? Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000)) : timer.secs),
  );
}
