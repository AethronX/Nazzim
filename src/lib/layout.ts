import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_CONTENT } from './theme';

// The prototype was drawn in a 402×874 iPhone frame (62pt top / 34pt bottom insets) with
// headers starting at y=56 and 26pt of padding under the tab bar. Keep those offsets relative
// to the real device's insets. On web the host page keeps content clear of the system bars.
export function useChrome() {
  const safe = useSafeAreaInsets();
  const insets = Platform.OS === 'web' ? { top: 0, bottom: 0 } : safe;
  const headerTop = Math.max(insets.top - 6, 20);
  const tabPad = Math.max(insets.bottom - 8, 12);
  const tabH = TAB_BAR_CONTENT + tabPad;
  return { headerTop, tabPad, tabH, scrollBottom: tabH + 33 };
}
