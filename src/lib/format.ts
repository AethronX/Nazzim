import type { Copy } from './copy';
import { daysBetween, fromKey } from './exams';

// "Wed 1 Oct" / "الأربعاء 1 أكتوبر" from a 'YYYY-MM-DD' key, without relying on Intl data in the JS engine.
export function fmtDate(key: string, L: Copy) {
  const d = fromKey(key);
  return `${L.wd[d.getDay()]} ${d.getDate()} ${L.months[d.getMonth()]}`;
}

// "MONDAY · 28 SEP" for the Today header.
export function fmtDateLine(key: string, L: Copy, ar: boolean) {
  const d = fromKey(key);
  const month = ar ? L.months[d.getMonth()] : L.months[d.getMonth()].toUpperCase();
  return `${L.wdLong[d.getDay()]} · ${d.getDate()} ${month}`;
}

// "today" / "tomorrow" / "in 5 days".
export function relDay(key: string, today: string, L: Copy) {
  const n = daysBetween(today, key);
  if (n <= 0) return L.dToday;
  if (n === 1) return L.dTomorrow;
  return L.dIn.replace('{n}', String(n));
}
