
import { useEffect } from 'react';
import { useOneSignalNotifications } from '@/hooks/useOneSignalNotifications';

const PushNotificationManager = () => {
  // This component just initializes OneSignal push notifications
  // The actual logic is in the hook
  useOneSignalNotifications();
  
  return null; // This component doesn't render anything
};

export default PushNotificationManager;

