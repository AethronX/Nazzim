// Supabase client. URL and publishable key come from .env (EXPO_PUBLIC_*), inlined at build time.
// Without them the app runs fully offline and the Account screen explains that sync is unavailable.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase: SupabaseClient | null = url && key
  ? createClient(url, key, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })
  : null;

// Refresh tokens only while the app is in the foreground (recommended for React Native).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', s => (s === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh()));
}
