import React from 'react';
import { Capacitor } from '@capacitor/core';
import { WifiOff, RefreshCw, CloudUpload } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

/**
 * Small persistent indicator, native app only: shows offline state and how
 * many locally-made changes are still waiting to sync. Never blocks
 * anything - purely informational, so a cashier always knows whether
 * what they just did has reached the server yet.
 */
const OfflineStatusBadge = () => {
  const { online, pendingCount, syncing } = useOfflineSync();

  // Web has no offline queue at all - nothing useful to show.
  if (!Capacitor.isNativePlatform()) return null;

  if (online && pendingCount === 0 && !syncing) return null;

  const label = !online
    ? pendingCount > 0
      ? `Offline · ${pendingCount} pending`
      : 'Offline'
    : syncing
    ? 'Syncing…'
    : `${pendingCount} pending`;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm border',
        !online
          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900'
          : 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900'
      )}
      title={!online ? 'No internet connection - changes are saved on this device and will sync automatically' : 'Syncing local changes to the server'}
    >
      {!online ? (
        <WifiOff className="h-3 w-3" />
      ) : syncing ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : (
        <CloudUpload className="h-3 w-3" />
      )}
      {label}
    </div>
  );
};

export default OfflineStatusBadge;
