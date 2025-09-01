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
                body: 'You have successfully logged in to Insight Inventory',
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
            body: 'You have signed out of Insight Inventory',
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

