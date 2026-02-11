import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { Config } from '../../constants/config';

// Initialize WebBrowser for auth
WebBrowser.maybeCompleteAuthSession();

// Redirect URL for OAuth
// Expo Go: use default (exp://...) - add to Supabase Redirect URLs
// Dev/Production build: opencalendar://auth/callback - add to Supabase
function getRedirectUrl(): string {
  // In Expo Go, custom scheme doesn't work - use default exp:// URL
  if (__DEV__ && (Platform.OS === 'ios' || Platform.OS === 'android')) {
    const url = AuthSession.makeRedirectUri({ path: 'auth/callback' });
    // If we get exp:// URL, use it for Expo Go
    if (url.startsWith('exp://')) return url;
  }
  return AuthSession.makeRedirectUri({
    scheme: Config.OAUTH_REDIRECT_SCHEME,
    path: 'auth/callback',
  });
}

interface AuthContextType {
  session: Session | null;
  user: any;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  supabase: SupabaseClient;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Create Supabase client
  const supabase = createClient(Config.SUPABASE_URL, Config.SUPABASE_ANON_KEY, {
    auth: {
      storage: {
        getItem: async (key: string) => {
          return await SecureStore.getItemAsync(key);
        },
        setItem: async (key: string, value: string) => {
          await SecureStore.setItemAsync(key, value);
        },
        removeItem: async (key: string) => {
          await SecureStore.deleteItemAsync(key);
        },
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);

      // Store access token as JWT for API calls
      if (session?.access_token) {
        SecureStore.setItemAsync('auth_token', session.access_token);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      // Update stored token
      if (session?.access_token) {
        SecureStore.setItemAsync('auth_token', session.access_token);
      } else {
        SecureStore.deleteItemAsync('auth_token');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      const redirectUrl = getRedirectUrl();
      if (__DEV__) {
        console.log('[Auth] Redirect URL - voeg toe aan Supabase:', redirectUrl);
      }
      // Create auth session
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // We handle redirect in WebBrowser
        },
      });

      if (error) throw error;

      // Open browser for OAuth
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success') {
          // Supabase returns tokens in hash fragment (#access_token=...)
          const url = result.url;
          const hashPart = url.includes('#') ? url.split('#')[1] : '';
          const params = new URLSearchParams(hashPart || url.split('?')[1] || '');
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            // Set session
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      await SecureStore.deleteItemAsync('auth_token');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signIn,
    signOut,
    supabase,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
