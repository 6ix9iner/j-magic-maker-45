
import { supabase } from '@/integrations/supabase/client';

interface PushNotificationPayload {
  user_id: string;
  title: string;
  body: string;
  notification_type?: string;
  data?: any;
}

export const sendPushNotification = async (payload: PushNotificationPayload) => {
  try {
    console.log('📤 Sending push notification:', payload);
    
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: payload
    });

    if (error) {
      console.error('❌ Push notification error:', error);
      throw error;
    }

    console.log('✅ Push notification sent:', data);
    return data;
    
  } catch (error) {
    console.error('💥 Failed to send push notification:', error);
    throw error;
  }
};




