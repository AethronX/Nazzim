import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
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
    // Deliberately dependency-free: the theme provider is one of the things that might have just crashed.
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 }}>
        <Text style={{ fontSize: 19, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>Something broke on this screen</Text>
        <Text style={{ fontSize: 14, lineHeight: 21, color: '#475569', textAlign: 'center' }}>
          Your plan is safe on this device. Try again, and if it keeps happening tell us at support@nazzim.app.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={this.retry}
          style={{ marginTop: 6, backgroundColor: '#285CE7', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Try again</Text>
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
