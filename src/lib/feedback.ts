import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';

const native = Platform.OS !== 'web';
let enabled = true;
// Settings › Controls › Haptics.
export const setHaptics = (on: boolean) => { enabled = on; };

// Light tick when something is completed, success pattern when a session ends (Apple HIG: Playing haptics).
export const tapDone = () => { if (native && enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };
export const sessionDone = () => { if (native && enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); };
export const select = () => { if (native && enabled) Haptics.selectionAsync().catch(() => {}); };

// Ask for a rating once, right after a positive moment (the 3rd completed focus session), never on launch.
// The OS still decides whether to show the prompt and caps it at 3 times a year.
export const REVIEW_AFTER_SESSIONS = 3;
export async function askForReview() {
  if (!native) return;
  try {
    if (await StoreReview.hasAction()) await StoreReview.requestReview();
  } catch {}
}
