import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Import OneSignal according to official docs
declare global {
  interface Window {
    plugins?: {
      OneSignal?: any;
    };
  }
}

// Import for React/Ionic according to official docs
let OneSignal: any = null;
if (Capacitor.isNativePlatform()) {
  try {
    OneSignal = require('onesignal-cordova-plugin').default;
  } catch (error) {
    console.log('OneSignal not available in this environment');
  }
}

export const useOneSignalNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) {
      console.log('Skipping OneSignal - user not authenticated or not native platform');
      return;
    }

    const initializeOneSignal = async () => {
      try {
        console.log('🚀 Starting OneSignal initialization following official docs');

        // Wait for device ready
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve(void 0);
          } else {
            document.addEventListener('deviceready', resolve, { once: true });
            // Fallback timeout
            setTimeout(resolve, 3000);
          }
        });

        // Check if OneSignal is available
        if (!OneSignal && !window.plugins?.OneSignal) {
          console.error('❌ OneSignal not available');
          return;
        }

        const oneSignalInstance = OneSignal || window.plugins?.OneSignal;
        
        if (!oneSignalInstance) {
          console.error('❌ OneSignal instance not found');
          return;
        }

        console.log('✅ OneSignal found, initializing...');

        // Enable verbose logging for debugging (as per official docs)
        if (oneSignalInstance.Debug) {
          oneSignalInstance.Debug.setLogLevel(6);
        }

        // Initialize with OneSignal App ID (as per official docs)
        await oneSignalInstance.initialize('904ebe61-ff30-44e2-8c3d-1c936a10597d');
        console.log('✅ OneSignal initialized');

        // Set external user ID
        if (oneSignalInstance.login) {
          await oneSignalInstance.login(user.id);
          console.log('✅ External user ID set:', user.id);
        }

        // Request permission (as per official docs)
        console.log('🔔 Requesting notification permission...');
        const accepted = await oneSignalInstance.Notifications.requestPermission(false);
        
        if (accepted) {
          console.log('✅ Permission granted');

          // Get subscription ID (player ID)
          const subscriptionId = await oneSignalInstance.User.pushSubscription.id;
          
          if (subscriptionId) {
            console.log('🎯 Got subscription ID:', subscriptionId);
            setPushToken(subscriptionId);
            await saveTokenToDatabase(subscriptionId);
            setIsRegistered(true);
          } else {
            console.error('❌ No subscription ID received');
          }
        } else {
          console.warn('❌ Permission denied');
        }

      } catch (error) {
        console.error('💥 OneSignal initialization error:', error);
      }
    };

    // Start initialization after device is ready
    initializeOneSignal();

  }, [user]);

  const saveTokenToDatabase = async (token: string) => {
    try {
      console.log('💾 Saving token to database for user:', user!.id);
      
      // STEP 1: Delete ALL existing tokens for this device (same push token)
      // This ensures only one user can have this device token at a time
      console.log('🧹 Cleaning up all existing tokens for this device...');
      const { error: deleteAllError } = await (supabase as any)
        .from('user_push_tokens')
        .delete()
        .eq('push_token', token);

      if (deleteAllError) {
        console.warn('⚠️ Warning cleaning up all tokens for this device:', deleteAllError);
      } else {
        console.log('✅ Cleaned up all existing tokens for this device');
      }

      // STEP 2: Delete any existing tokens for this user (in case they logged in on another device)
      console.log('🧹 Cleaning up existing tokens for this user...');
      const { error: deleteUserError } = await (supabase as any)
        .from('user_push_tokens')
        .delete()
        .eq('user_id', user!.id);

      if (deleteUserError) {
        console.warn('⚠️ Warning cleaning up user tokens:', deleteUserError);
      } else {
        console.log('✅ Cleaned up existing tokens for this user');
      }
      
      // STEP 3: Insert the new token for the current user
      console.log('📱 Inserting new token for current user...');
      const { error: insertError } = await (supabase as any)
        .from('user_push_tokens')
        .insert({
          user_id: user!.id,
          push_token: token,
          device_info: {
            platform: 'android',
            provider: 'onesignal',
            timestamp: new Date().toISOString(),
            user_id: user!.id // Also store user_id in device_info for tracking
          }
        });

      if (insertError) {
        console.error('❌ Database save error:', insertError);
        throw insertError;
      }

      console.log('✅ Token saved to database successfully for user:', user!.id);

    } catch (error) {
      console.error('💥 Failed to save token:', error);
    }
  };

  return {
    isRegistered,
    pushToken
  };
};
