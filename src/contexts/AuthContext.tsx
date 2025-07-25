import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { sendPushNotification } from '@/utils/pushNotificationUtils';
import { Capacitor } from '@capacitor/core';

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
        console.log('🔐 Auth state changed:', event, !!currentSession);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_IN' && currentSession?.user) {
          toast.success('Successfully signed in');

          // Only send push notifications on Android native platform
          if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
            // Check if user already has a push token before sending notification
            setTimeout(async () => {
              try {
                console.log('📱 Checking for existing Android push token...');
                
                const { data: tokenData, error: tokenError } = await (supabase as any)
                  .from('user_push_tokens')
                  .select('push_token')
                  .eq('user_id', currentSession.user.id)
                  .limit(1)
                  .maybeSingle();

                if (tokenError) {
                  console.error('❌ Error checking for push token:', tokenError);
                  return;
                }

                if (tokenData?.push_token) {
                  console.log('📱 Found existing push token, sending Android login notification...');
                  await sendPushNotification({
                    user_id: currentSession.user.id,
                    title: 'Welcome Back! 👋',
                    body: 'You have successfully signed in to your Android app',
                    notification_type: 'android_login',
                    data: {
                      timestamp: new Date().toISOString(),
                      force_display: 'true',
                      platform: 'android'
                    }
                  });
                } else {
                  console.log('📱 No push token found yet - user needs to register for notifications first');
                }
              } catch (error) {
                console.error('❌ Failed to send Android login notification:', error);
              }
            }, 8000);
          } else {
            console.log('🌐 Not Android platform - skipping push notification');
          }
        }

        if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out');
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

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
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
      console.log('🚪 Starting Android sign out process...');

      const { data } = await supabase.auth.getSession();
      const currentUser = data.session?.user;

      if (!currentUser) {
        console.log('⚠️ No active session found');
        setUser(null);
        setSession(null);
        return;
      }

      // Only send Android push notifications on native Android platform if token exists
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        try {
          console.log('📱 Checking for push token before sending logout notification...');
          
          const { data: tokenData, error: tokenError } = await (supabase as any)
            .from('user_push_tokens')
            .select('push_token')
            .eq('user_id', currentUser.id)
            .limit(1)
            .maybeSingle();

          if (tokenError) {
            console.error('❌ Error checking for push token:', tokenError);
          } else if (tokenData?.push_token) {
            console.log('📱 Found push token, sending Android logout notification...');
            await sendPushNotification({
              user_id: currentUser.id,
              title: 'Goodbye! 👋',
              body: 'You have signed out of your Android app',
              notification_type: 'android_logout',
              data: {
                timestamp: new Date().toISOString(),
                force_display: 'true',
                platform: 'android'
              }
            });

            console.log('✅ Android logout notification sent');
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.log('📱 No push token found - skipping logout notification');
          }
        } catch (fcmError) {
          console.error('❌ Failed to send Android logout notification:', fcmError);
        }
      }

      // Clear state and sign out from Supabase
      setUser(null);
      setSession(null);

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('⚠️ Supabase sign out error:', error);
      } else {
        console.log('✅ User signed out from Supabase');
      }

    } catch (error: any) {
      console.error('❌ Unexpected sign out error:', error);
      setUser(null);
      setSession(null);

      if (error.message !== 'Auth session missing!') {
        toast.error('Unexpected sign out error');
      }
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






