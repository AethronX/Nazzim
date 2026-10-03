import { counted, type Copy } from './copy';
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

// "today" / "tomorrow" / "in 5 days" from a day count. The one place that fills `dIn`: three screens used to
// replace a `{n}` placeholder the string does not have, so students saw the raw template "in {c}".
export function inDays(n: number, L: Copy, ar = false) {
  if (n <= 0) return L.dToday;
  if (n === 1) return L.dTomorrow;
  return L.dIn.replace('{c}', counted(n, 'day', L, ar));
}

// The same, from a date key.
export function relDay(key: string, today: string, L: Copy, ar = false) {
  return inDays(daysBetween(today, key), L, ar);
}
