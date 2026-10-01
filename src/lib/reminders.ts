import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Copy } from './copy';

// Local notifications only (no server): daily habit check-in, exam eve, and focus-session end.
export const remindersSupported = Platform.OS !== 'web';

export type ReminderSettings = { on: boolean; habits: boolean; habitHour: number; exams: boolean; focus: boolean };
export const DEFAULT_REMINDERS: ReminderSettings = { on: false, habits: true, habitHour: 16, exams: true, focus: true };
export const HABIT_HOURS = [8, 20, 22];
const EXAM_EVE_HOUR = 19;

const HABITS_ID = 'nz-habits';
const STREAK_ID = 'nz-streak';
const STREAK_HOUR = 20;
const EXAM_PREFIX = 'nz-exam-';
const FOCUS_ID = 'nz-focus';
const CHANNEL = 'reminders';

if (remindersSupported) {
  // The in-app toast already announces a finished session, so don't repeat it as a banner in the foreground.
  Notifications.setNotificationHandler({
    handleNotification: async n => {
      const quiet = n.request.identifier === FOCUS_ID;
      return { shouldShowBanner: !quiet, shouldShowList: true, shouldPlaySound: !quiet, shouldSetBadge: false };
    },
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT }).catch(() => {});
  }
}

export type Permission = 'granted' | 'denied' | 'undetermined';

export async function getPermission(): Promise<Permission> {
  if (!remindersSupported) return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status as Permission;
}

// Ask only when the user turns reminders on (Apple HIG: request permission in context, not at launch).
export async function requestPermission(): Promise<boolean> {
  if (!remindersSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

type Exam = { id: string; name: string; days: number };

async function cancelMatching(match: (id: string) => boolean) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter(n => match(n.identifier)).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

// What the daily reminders say and when: the student's own next move, 15 min before their study time.
export type DailyContext = { hour: number; minute: number; next: string | null; streakDays: number; studiedToday: boolean };

// Rebuild the reminders from the current settings, language and plan. At most two a day (the plan reminder and,
// only when a streak is alive and nothing is done yet, one evening nudge), never in quiet hours.
export async function syncReminders(s: ReminderSettings, L: Copy, exams: Exam[], daily?: DailyContext) {
  if (!remindersSupported) return;
  await cancelMatching(id => id === HABITS_ID || id === STREAK_ID || id.startsWith(EXAM_PREFIX));
  if (!s.on || (await getPermission()) !== 'granted') return;

  if (s.habits) {
    await Notifications.scheduleNotificationAsync({
      identifier: HABITS_ID,
      content: { title: L.nHabitTitle, body: daily?.next ? L.nDailyBody.replace('{t}', daily.next) : L.nHabitBody, data: { url: '/' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: daily?.hour ?? s.habitHour, minute: daily?.minute ?? 0, channelId: CHANNEL },
    });
    // Loss aversion, gently: only for a living streak (2+ days), only if today has no study yet, once, at 20:00.
    const at = new Date(); at.setHours(STREAK_HOUR, 0, 0, 0);
    if (daily && daily.streakDays >= 2 && !daily.studiedToday && at.getTime() > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        identifier: STREAK_ID,
        content: { title: L.nStreakTitle.replace('{n}', String(daily.streakDays)), body: L.nStreakBody, data: { url: '/' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
      });
    }
  }
  if (s.exams) {
    for (const e of exams) {
      const at = new Date();
      at.setDate(at.getDate() + e.days - 1);
      at.setHours(EXAM_EVE_HOUR, 0, 0, 0);
      if (at.getTime() <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: EXAM_PREFIX + e.id,
        content: { title: L.nExamTitle.replace('{name}', e.name), body: L.nExamBody, data: { url: '/plan' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
      });
    }
  }
}

// Fires when a running focus session ends, so it works with Nazzim closed or the phone locked.
export async function scheduleFocusEnd(endAt: number, task: string, L: Copy) {
  if (!remindersSupported || endAt <= Date.now()) return;
  await Notifications.cancelScheduledNotificationAsync(FOCUS_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: FOCUS_ID,
    content: { title: L.nFocusTitle, body: L.nFocusBody.replace('{task}', task), data: { url: '/focus' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: endAt, channelId: CHANNEL },
  });
}

export async function cancelFocusEnd() {
  if (!remindersSupported) return;
  await Notifications.cancelScheduledNotificationAsync(FOCUS_ID).catch(() => {});
}
