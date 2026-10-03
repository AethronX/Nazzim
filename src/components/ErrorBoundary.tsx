import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Appearance, Text, TouchableOpacity, View } from 'react-native';
import { COPY } from '../lib/copy';
import { track } from '../services/analytics';

// A render crash used to mean a white screen and a student who uninstalls without telling anyone. Now it
// means a readable screen, a way back, and one event so the failure is visible in the dashboard.
//
// What is reported: where it happened and the error's own message. Never the student's data — no task
// titles, no subject names, no notes. The message is trimmed in case a library interpolates a value into it.
type Props = { children: ReactNode; where?: string; fallback?: (retry: () => void) => ReactNode };
type State = { error: Error | null };

const SAFE_MESSAGE = 160;

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    track({
      name: 'app_error',
      props: {
        where: this.props.where ?? firstComponent(info.componentStack) ?? 'unknown',
        message: String(error?.message ?? error).slice(0, SAFE_MESSAGE),
        fatal: true,
      },
    });
  }

  retry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.retry);
    // Deliberately provider-free: the theme provider is one of the things that might have just crashed. Without
    // it we do not know the student's language, so the message is shown in both — Arabic first.
    const dark = Appearance.getColorScheme() === 'dark';
    const ink = dark ? '#EFF2F7' : '#121927', ink2 = dark ? '#C7CCD7' : '#4D5667';
    return (
      <View style={{ flex: 1, backgroundColor: dark ? '#0C101A' : '#F8FAFD', alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 }}>
        {[COPY.ar, COPY.en].map((L, i) => (
          <View key={i} style={{ gap: 6, alignItems: 'center', maxWidth: 360 }}>
            <Text style={{ fontSize: 19, fontWeight: '700', color: ink, textAlign: 'center', writingDirection: i ? 'ltr' : 'rtl' }}>{L.errT}</Text>
            <Text style={{ fontSize: 14, lineHeight: 21, color: ink2, textAlign: 'center', writingDirection: i ? 'ltr' : 'rtl' }}>{L.errS}</Text>
          </View>
        ))}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${COPY.ar.errRetry} · ${COPY.en.errRetry}`}
          onPress={this.retry}
          style={{ marginTop: 6, minHeight: 48, justifyContent: 'center', backgroundColor: '#285CE7', paddingHorizontal: 30, borderRadius: 16 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>{`${COPY.ar.errRetry} · ${COPY.en.errRetry}`}</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

// "at ExamDetail (...)" → "ExamDetail". Enough to find the screen, nothing about the student.
function firstComponent(stack?: string | null): string | undefined {
  const m = stack?.match(/\s*(?:at|in)\s+([A-Za-z0-9_$]+)/);
  return m?.[1];
}
