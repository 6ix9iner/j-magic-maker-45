import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { subscribeSyncState, SyncState } from '@/lib/offline/syncEngine';

const idleState: SyncState = {
  online: true,
  pendingCount: 0,
  syncing: false,
  lastSyncedAt: null,
  lastError: null,
};

/**
 * Live offline/sync status for the current view. On web this always
 * reports online with nothing pending - there is no offline queue on web.
 */
export function useOfflineSync(): SyncState {
  const [state, setState] = useState<SyncState>(idleState);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    return subscribeSyncState(setState);
  }, []);

  return state;
}
