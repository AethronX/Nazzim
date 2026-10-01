// Environment detection and production-safety switches.
//
// APP_ENV is set per EAS build profile (eas.json: development | preview | production). In Expo Go and on a
// local dev server it is undefined, so we fall back to __DEV__. Nothing here reads a secret: the only values
// the client holds are the Supabase URL and the *publishable* key, which are safe to ship because every table
// is protected by row-level security (see supabase/migrations and SECURITY_AUDIT.md).
import Constants from 'expo-constants';

export type AppEnv = 'development' | 'preview' | 'production';

const fromProfile = (process.env.APP_ENV ?? Constants.expoConfig?.extra?.appEnv) as AppEnv | undefined;
export const APP_ENV: AppEnv = fromProfile ?? (__DEV__ ? 'development' : 'production');

export const isProduction = APP_ENV === 'production';
export const isDev = APP_ENV === 'development';

/** App version shown in Settings and attached to crash/analytics payloads. */
export const appVersion = Constants.expoConfig?.version ?? '0.0.0';
export const buildNumber =
  Constants.expoConfig?.ios?.buildNumber ?? String(Constants.expoConfig?.android?.versionCode ?? '0');

/** Supabase client config. Missing values are not an error: the app runs fully offline without an account. */
export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const syncConfigured = !!(supabaseUrl && supabaseKey);

/**
 * Guard against a production build pointing at a development backend. Returns the problems found so the
 * release checklist can fail loudly rather than shipping a build that writes to the wrong database.
 */
export function productionConfigProblems(): string[] {
  const problems: string[] = [];
  if (!isProduction) return problems;
  if (supabaseUrl && /localhost|127\.0\.0\.1|ngrok|\.local(:|$)/.test(supabaseUrl)) {
    problems.push(`Production build points at a development API: ${supabaseUrl}`);
  }
  if (supabaseKey && /service_role|^eyJ.*service/i.test(supabaseKey)) {
    problems.push('A service-role key is present in the client bundle. Only the publishable key may ship.');
  }
  return problems;
}
