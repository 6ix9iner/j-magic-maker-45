import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { sendPushNotification } from '@/utils/pushNotificationUtils';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { startSyncEngine } from '@/lib/offline/syncEngine';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('🔐 Auth event:', event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Send login notification only on native platform after successful login
        if (event === 'SIGNED_IN' && currentSession?.user && Capacitor.isNativePlatform()) {
          // Wait for OneSignal to be ready and registered
          setTimeout(async () => {
            try {
              console.log('📤 Sending login notification');
              await sendPushNotification({
                user_id: currentSession.user.id,
                title: '👋 Welcome Back!',
                body: 'You have successfully logged in to MySkrib',
                notification_type: 'login'
              });
            } catch (error) {
              console.error('Failed to send login notification:', error);
            }
          }, 15000); // Wait 15 seconds for OneSignal to be ready
        }

        if (event === 'SIGNED_OUT') {
          toast.info('Signed out');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Native OAuth (Google/Apple) deep-link callback. On native platforms
  // sign-in opens the system browser (see Auth.tsx), which redirects to
  // com.posapp.app://login-callback?code=... once done - Android/iOS route
  // that straight back into the app (see AndroidManifest.xml / Info.plist)
  // and this listener finishes the sign-in by exchanging the code for a
  // session, then closes the browser tab that was left open.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      console.log('🔗 appUrlOpen:', url);
      if (!url.startsWith('com.posapp.app://login-callback')) return;

      // Supabase can return either a PKCE `?code=...` (query string) or an
      // implicit-flow `#access_token=...&refresh_token=...` (URL fragment) -
      // this project's Google provider returns the latter, so both are
      // handled here rather than assuming one.
      const parsed = new URL(url);
      const searchParams = new URLSearchParams(parsed.search);
      const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));

      const code = searchParams.get('code');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (!code && !(accessToken && refreshToken)) {
        console.log('🔗 login-callback had no code/tokens (stale/replayed intent) - ignoring');
        return;
      }

      // The native intent gets cleared after first delivery (see
      // MainActivity#onNewIntent), but guard here too in case a duplicate
      // slips through - these are single-use, so retrying one we've
      // already handled would just fail and pop a bogus error toast.
      const dedupeKey = code || accessToken || '';
      const lastHandledKey = sessionStorage.getItem('oauth_last_key');
      if (lastHandledKey === dedupeKey) {
        console.log('🔗 login-callback already handled this session - ignoring');
        return;
      }
      sessionStorage.setItem('oauth_last_key', dedupeKey);

      try {
        if (accessToken && refreshToken) {
          console.log('🔗 setting session from OAuth tokens...');
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
        } else if (code) {
          console.log('🔗 exchanging OAuth code for session...');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        console.log('🔗 OAuth sign-in succeeded');
      } catch (error: any) {
        console.error('OAuth callback error:', error?.message || error);
        toast.error(error?.message || 'Sign-in failed');
      } finally {
        Browser.close().catch(() => {});
      }
    });

    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
  }, []);

  // Start the offline sync engine once we know who's logged in. Native
  // only - on web there is no local queue to drive (see lib/offline).
  useEffect(() => {
    if (user?.id && Capacitor.isNativePlatform()) {
      startSyncEngine(user.id);
    }
  }, [user?.id]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Successfully signed in');
    } catch (error: any) {
      toast.error(error.message || 'Error signing in');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;
      toast.success('Registration successful! Please verify your email.');
    } catch (error: any) {
      toast.error(error.message || 'Error signing up');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Send logout notification on native platform before signing out
      if (user && Capacitor.isNativePlatform()) {
        try {
          console.log('📤 Sending logout notification');
          await sendPushNotification({
            user_id: user.id,
            title: '👋 Goodbye!',
            body: 'You have signed out of MySkrib',
            notification_type: 'logout'
          });
          // Small delay to ensure notification is sent
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error('Failed to send logout notification:', error);
        }
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

