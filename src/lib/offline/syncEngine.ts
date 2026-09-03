import { Network } from '@capacitor/network';
import { supabase } from '@/integrations/supabase/client';
import { offlineDb, SyncQueueItem } from './db';

/**
 * Drives the offline sync queue: watches connectivity, and whenever the
 * device is online, drains any queued writes (in creation order) to
 * Supabase, then pulls a fresh copy of the user's data back down.
 *
 * This only ever runs on native platforms - see repository.ts, which is
 * the only thing that enqueues work here. On web this module is imported
 * but never actually invoked.
 */

type Listener = (state: SyncState) => void;

export interface SyncState {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

let state: SyncState = {
  online: true,
  pendingCount: 0,
  syncing: false,
  lastSyncedAt: null,
  lastError: null,
};

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(state));
}

export function subscribeSyncState(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export async function refreshPendingCount() {
  state = { ...state, pendingCount: await offlineDb.syncQueue.count() };
  emit();
}

const MAX_ATTEMPTS = 8;

async function applyOne(item: SyncQueueItem): Promise<void> {
  switch (item.type) {
    case 'product_create': {
      const { error } = await supabase.from('products').insert(item.payload);
      if (error && error.code !== '23505') throw error; // ignore duplicate-id replays
      await offlineDb.products.update(item.entityId, { pendingSync: 0 });
      break;
    }
    case 'product_update': {
      const { id, ...fields } = item.payload;
      const { error } = await supabase.from('products').update(fields).eq('id', id);
      if (error) throw error;
      await offlineDb.products.update(item.entityId, { pendingSync: 0 });
      break;
    }
    case 'product_delete': {
      const { error } = await supabase.from('products').delete().eq('id', item.entityId);
      if (error) throw error;
      await offlineDb.products.delete(item.entityId);
      break;
    }
    case 'sale_create': {
      const { sale, items } = item.payload as { sale: any; items: any[] };
      const { error: saleError } = await supabase.from('sales').insert(sale);
      if (saleError && saleError.code !== '23505') throw saleError;

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from('sale_items').insert(items);
        if (itemsError && itemsError.code !== '23505') throw itemsError;
      }

      // Stock impact applies as an atomic delta, not an absolute overwrite -
      // see supabase/migrations/20260902_decrement_stock.sql. This is what
      // makes it safe for two devices to sell the same product offline and
      // sync later without clobbering each other's count.
      for (const it of items) {
        if (!it.product_id) continue;
        const { error: stockError } = await supabase.rpc('decrement_stock', {
          p_product_id: it.product_id,
          p_qty: it.quantity,
        });
        if (stockError) throw stockError;
      }

      await offlineDb.sales.update(item.entityId, { pendingSync: 0 });
      break;
    }
    case 'business_info_upsert': {
      const { error } = await supabase.from('business_info').upsert(item.payload, { onConflict: 'user_id' });
      if (error) throw error;
      await offlineDb.businessInfo.update(item.payload.user_id, { pendingSync: 0 });
      break;
    }
  }
}

let draining = false;

export async function drainSyncQueue(): Promise<void> {
  if (draining) return;
  draining = true;
  state = { ...state, syncing: true };
  emit();

  try {
    // Process strictly in creation order so, e.g., a product created
    // offline is synced before a sale that references it.
    const items = await offlineDb.syncQueue.orderBy('createdAt').toArray();

    for (const item of items) {
      try {
        await applyOne(item);
        if (item.id !== undefined) {
          await offlineDb.syncQueue.delete(item.id);
        }
      } catch (err: any) {
        const attempts = item.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          // Give up on this one so it can't block the rest of the queue
          // forever - it stays visible as a failed item for now.
          console.error('Offline sync: giving up on item after max attempts', item, err);
          if (item.id !== undefined) {
            await offlineDb.syncQueue.update(item.id, {
              attempts,
              lastError: err?.message || String(err),
            });
          }
          state = { ...state, lastError: `Failed to sync ${item.type}: ${err?.message || err}` };
        } else if (item.id !== undefined) {
          await offlineDb.syncQueue.update(item.id, {
            attempts,
            lastError: err?.message || String(err),
          });
        }
        // Stop draining on first failure this pass - retry the whole
        // queue again on the next connectivity/interval trigger rather
        // than racing ahead out of order.
        break;
      }
    }

    state = { ...state, lastSyncedAt: new Date().toISOString() };
  } finally {
    draining = false;
    state = { ...state, syncing: false };
    await refreshPendingCount();
  }
}

/**
 * Pulls a fresh copy of the user's products, business info, and recent
 * sales down from Supabase into the local database. Called on login and
 * whenever connectivity is restored, so the device always has a
 * reasonably fresh offline cache to work from.
 */
export async function pullFromServer(userId: string): Promise<void> {
  const [
    { data: products, error: productsError },
    { data: businessInfo, error: businessInfoError },
    { data: sales, error: salesError },
  ] = await Promise.all([
    supabase.from('products').select('*').eq('user_id', userId),
    supabase.from('business_info').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('sales').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(500),
  ]);
  if (productsError) console.error('pullFromServer: products fetch failed', productsError);
  if (businessInfoError) console.error('pullFromServer: business_info fetch failed', businessInfoError);
  if (salesError) console.error('pullFromServer: sales fetch failed', salesError);

  // Sale items depend on which sale ids came back above, but MUST be
  // fetched here - before the Dexie transaction opens below - and not
  // awaited from inside it. Awaiting a network call partway through an
  // IndexedDB transaction breaks the browser's transaction scope (it can
  // auto-close while the fetch is in flight), throwing and rolling back
  // EVERY write already made in that same transaction - which is why
  // products/business info/sales were all silently failing to update
  // together whenever a user had any sales history at all.
  let saleItems: any[] | null = null;
  if (sales && sales.length > 0) {
    const saleIds = sales.map((s: any) => s.id);
    const { data: items, error: itemsError } = await supabase.from('sale_items').select('*').in('sale_id', saleIds);
    if (itemsError) console.error('pullFromServer: sale_items fetch failed', itemsError);
    saleItems = items ?? null;
  }

  await offlineDb.transaction('rw', offlineDb.products, offlineDb.businessInfo, offlineDb.sales, offlineDb.saleItems, async () => {
    if (products) {
      // Don't clobber rows that still have unsynced local edits.
      const pendingIds = new Set((await offlineDb.products.where({ pendingSync: 1 }).primaryKeys()) as string[]);
      for (const p of products) {
        if (pendingIds.has(p.id)) continue;
        await offlineDb.products.put({ ...p, pendingSync: 0, deleted: 0 });
      }
    }
    if (businessInfo) {
      const existing = await offlineDb.businessInfo.get(userId);
      if (!existing || existing.pendingSync !== 1) {
        await offlineDb.businessInfo.put({ ...businessInfo, pendingSync: 0 });
      }
    }
    if (sales) {
      const pendingSaleIds = new Set((await offlineDb.sales.where({ pendingSync: 1 }).primaryKeys()) as string[]);
      for (const s of sales) {
        if (pendingSaleIds.has(s.id)) continue;
        await offlineDb.sales.put({ ...s, pendingSync: 0 });
      }
      if (saleItems) {
        for (const it of saleItems) {
          await offlineDb.saleItems.put(it);
        }
      }
    }
  });
}

let started = false;
let currentUserId: string | null = null;

/**
 * Starts watching connectivity and draining the queue whenever the device
 * comes online. Safe to call multiple times - only wires listeners once.
 */
export function startSyncEngine(userId: string): void {
  currentUserId = userId;
  refreshPendingCount();

  const runIfOnline = async () => {
    const status = await Network.getStatus();
    state = { ...state, online: status.connected };
    emit();
    if (status.connected && currentUserId) {
      await drainSyncQueue();
      await pullFromServer(currentUserId).catch((e) => console.error(`pullFromServer failed: ${e?.name || ''} ${e?.message || String(e)}`, e?.stack || ''));
    }
  };

  if (!started) {
    started = true;
    Network.addListener('networkStatusChange', (status) => {
      state = { ...state, online: status.connected };
      emit();
      if (status.connected) {
        runIfOnline();
      }
    });
    // Periodic safety-net drain in case a status-change event is missed.
    setInterval(runIfOnline, 60_000);
  }

  runIfOnline();
}
