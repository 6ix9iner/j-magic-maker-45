import { v4 as uuidv4 } from 'uuid';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { supabase } from '@/integrations/supabase/client';
import { offlineDb, LocalProduct, LocalBusinessInfo } from './db';
import { drainSyncQueue, refreshPendingCount } from './syncEngine';

/**
 * The ONE place every screen goes for products / sales / business info.
 *
 * - Web: every function is a thin passthrough to Supabase, byte-for-byte
 *   the same behavior the app had before this file existed. Web is always
 *   assumed online; there is no local cache and no offline queue on web.
 * - Native (Android/iOS): local-first. Reads come from the on-device
 *   database; writes land there immediately (so the UI never waits on a
 *   network round-trip) and are either pushed straight through to
 *   Supabase (if currently online) or queued for the sync engine to apply
 *   later (if offline).
 *
 * Every row created here - product, sale, sale item - gets its id
 * generated client-side (see uuidv4() below), on BOTH platforms, so
 * there's a single id story everywhere and never any server-side id
 * remapping to reconcile after a sync.
 */

export interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  purchase_price: number;
  stock_count: number;
  category: string | null;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface SaleItemInput {
  // Only the fields a sale actually needs - callers' Product shapes vary
  // slightly (e.g. ProductLookup's doesn't carry purchase_price), so this
  // is intentionally narrower than the full Product interface above.
  product: Pick<Product, 'id' | 'barcode' | 'name' | 'price' | 'stock_count'>;
  quantity: number;
}

export interface CompletedSale {
  id: string;
  total_amount: number;
  payment_method: string | null;
  transaction_id: string | null;
  created_at: string;
  items: {
    id: string;
    product_id: string | null;
    barcode_at_sale: string | null;
    name_at_sale: string | null;
    price_at_sale: number;
    quantity: number;
  }[];
}

export interface BusinessInfo {
  id?: string;
  business_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website?: string | null;
  tax_id?: string | null;
  thank_you_message?: string | null;
  inventory_password_hash?: string | null;
}

const isNative = () => Capacitor.isNativePlatform();

async function isOnline(): Promise<boolean> {
  if (!isNative()) return true; // web is never routed through the offline path anyway
  try {
    const status = await Network.getStatus();
    return status.connected;
  } catch {
    return true;
  }
}

async function enqueue(type: import('./db').SyncOpType, entityId: string, payload: any) {
  await offlineDb.syncQueue.add({
    type,
    entityId,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  });
  // So the "N pending" badge updates the instant something is queued,
  // rather than waiting for the next connectivity check or 60s tick.
  await refreshPendingCount();
}

/** Fire-and-forget: try to sync now if online, but never block the caller on it. */
function kickSync() {
  isOnline().then((online) => {
    if (online) drainSyncQueue().catch((e) => console.error('drainSyncQueue failed', e));
  });
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function getProducts(userId: string): Promise<Product[]> {
  if (!isNative()) {
    const { data, error } = await supabase.from('products').select('*').eq('user_id', userId).order('name');
    if (error) throw error;
    return (data as Product[]) || [];
  }

  const rows = await offlineDb.products.where({ user_id: userId }).and((p) => p.deleted === 0).sortBy('name');
  return rows.map(stripLocalProductFields);
}

export async function getProductByBarcode(userId: string, barcode: string): Promise<Product | null> {
  if (!isNative()) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return (data as Product) || null;
  }

  const row = await offlineDb.products.where({ user_id: userId, barcode }).first();
  if (!row || row.deleted === 1) return null;
  return stripLocalProductFields(row);
}

export async function createProduct(
  userId: string,
  data: Omit<Product, 'id' | 'user_id'>
): Promise<Product> {
  const id = uuidv4();
  const now = new Date().toISOString();

  if (!isNative()) {
    const { error } = await supabase.from('products').insert({ id, ...data, user_id: userId });
    if (error) throw error;
    return { id, user_id: userId, ...data };
  }

  const localRow: LocalProduct = {
    id,
    user_id: userId,
    barcode: data.barcode,
    name: data.name,
    price: data.price,
    purchase_price: data.purchase_price,
    stock_count: data.stock_count,
    category: data.category,
    created_at: now,
    updated_at: now,
    pendingSync: 1,
    deleted: 0,
  };
  await offlineDb.products.put(localRow);
  await enqueue('product_create', id, { id, ...data, user_id: userId, created_at: now, updated_at: now });
  kickSync();
  return stripLocalProductFields(localRow);
}

export async function updateProduct(
  userId: string,
  id: string,
  data: Partial<Omit<Product, 'id' | 'user_id'>>
): Promise<void> {
  const now = new Date().toISOString();

  if (!isNative()) {
    const { error } = await supabase
      .from('products')
      .update({ ...data, updated_at: now })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return;
  }

  await offlineDb.products.update(id, { ...data, updated_at: now, pendingSync: 1 });
  await enqueue('product_update', id, { id, ...data, updated_at: now });
  kickSync();
}

export async function deleteProduct(userId: string, id: string): Promise<void> {
  if (!isNative()) {
    const { error } = await supabase.from('products').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return;
  }

  // Soft-delete locally right away so it disappears from the UI; the row
  // is only actually removed from the local DB once the delete syncs.
  await offlineDb.products.update(id, { deleted: 1, pendingSync: 1 });
  await enqueue('product_delete', id, {});
  kickSync();
}

/** True if a product with this barcode already exists for the user. */
export async function barcodeExists(userId: string, barcode: string, excludingId?: string): Promise<boolean> {
  const existing = await getProductByBarcode(userId, barcode);
  return !!existing && existing.id !== excludingId;
}

function stripLocalProductFields(row: LocalProduct): Product {
  const { pendingSync, deleted, ...rest } = row;
  return rest;
}

// ---------------------------------------------------------------------------
// Business info
// ---------------------------------------------------------------------------

export async function getBusinessInfo(userId: string): Promise<BusinessInfo | null> {
  if (!isNative()) {
    const { data, error } = await supabase.from('business_info').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data as BusinessInfo | null;
  }

  const row = await offlineDb.businessInfo.get(userId);
  if (!row) return null;
  const { pendingSync, ...rest } = row;
  return rest;
}

export async function saveBusinessInfo(userId: string, data: BusinessInfo): Promise<BusinessInfo> {
  const now = new Date().toISOString();

  if (!isNative()) {
    const { error } = await supabase.from('business_info').upsert({ ...data, user_id: userId }, { onConflict: 'user_id' });
    if (error) throw error;
    return data;
  }

  const existing = await offlineDb.businessInfo.get(userId);
  const localRow: LocalBusinessInfo = {
    user_id: userId,
    id: existing?.id || data.id || uuidv4(),
    business_name: data.business_name,
    address: data.address,
    city: data.city,
    state: data.state,
    zip_code: data.zip_code,
    phone: data.phone,
    email: data.email,
    website: data.website ?? null,
    tax_id: data.tax_id ?? null,
    thank_you_message: data.thank_you_message ?? null,
    inventory_password_hash: data.inventory_password_hash ?? existing?.inventory_password_hash ?? null,
    created_at: existing?.created_at || now,
    updated_at: now,
    pendingSync: 1,
  };
  await offlineDb.businessInfo.put(localRow);
  await enqueue('business_info_upsert', userId, { ...localRow, pendingSync: undefined });
  kickSync();
  const { pendingSync, ...rest } = localRow;
  return rest;
}

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------

export async function completeSale(
  userId: string,
  cashierId: string,
  items: SaleItemInput[]
): Promise<CompletedSale> {
  const saleId = uuidv4();
  const now = new Date().toISOString();
  const totalAmount = items.reduce((sum, it) => sum + it.product.price * it.quantity, 0);

  const saleItemRows = items.map((it) => ({
    id: uuidv4(),
    sale_id: saleId,
    product_id: it.product.id,
    quantity: it.quantity,
    price_at_sale: it.product.price,
    barcode_at_sale: it.product.barcode,
    name_at_sale: it.product.name,
  }));

  if (!isNative()) {
    const { error: saleError } = await supabase.from('sales').insert({
      id: saleId,
      total_amount: totalAmount,
      payment_method: 'cash',
      user_id: userId,
      cashier_id: cashierId,
    });
    if (saleError) throw saleError;

    const { error: itemsError } = await supabase.from('sale_items').insert(saleItemRows);
    if (itemsError) throw itemsError;

    for (const it of items) {
      const { error: stockError } = await supabase
        .from('products')
        .update({ stock_count: it.product.stock_count - it.quantity, updated_at: now })
        .eq('id', it.product.id)
        .eq('user_id', userId);
      if (stockError) throw stockError;
    }

    return {
      id: saleId,
      total_amount: totalAmount,
      payment_method: 'cash',
      transaction_id: null,
      created_at: now,
      items: saleItemRows,
    };
  }

  // Native: write everything locally first so the sale + receipt are
  // available immediately, then queue the sync.
  await offlineDb.transaction('rw', offlineDb.sales, offlineDb.saleItems, offlineDb.products, offlineDb.syncQueue, async () => {
    await offlineDb.sales.put({
      id: saleId,
      user_id: userId,
      cashier_id: cashierId,
      total_amount: totalAmount,
      payment_method: 'cash',
      transaction_id: null,
      created_at: now,
      updated_at: now,
      pendingSync: 1,
    });

    for (const row of saleItemRows) {
      await offlineDb.saleItems.put({ ...row, created_at: now });
    }

    for (const it of items) {
      const current = await offlineDb.products.get(it.product.id);
      if (current) {
        await offlineDb.products.update(it.product.id, {
          stock_count: Math.max(0, current.stock_count - it.quantity),
          updated_at: now,
        });
      }
    }

    await enqueue('sale_create', saleId, {
      sale: {
        id: saleId,
        total_amount: totalAmount,
        payment_method: 'cash',
        user_id: userId,
        cashier_id: cashierId,
      },
      items: saleItemRows,
    });
  });

  kickSync();

  return {
    id: saleId,
    total_amount: totalAmount,
    payment_method: 'cash',
    transaction_id: null,
    created_at: now,
    items: saleItemRows,
  };
}

export async function getSales(userId: string): Promise<CompletedSale[]> {
  if (!isNative()) {
    const { data: sales, error } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const saleIds = (sales || []).map((s) => s.id);
    const { data: items } = saleIds.length
      ? await supabase.from('sale_items').select('*').in('sale_id', saleIds)
      : { data: [] as any[] };
    return (sales || []).map((s) => ({
      ...s,
      items: (items || []).filter((it) => it.sale_id === s.id),
    })) as CompletedSale[];
  }

  const sales = await offlineDb.sales.where({ user_id: userId }).reverse().sortBy('created_at');
  const result: CompletedSale[] = [];
  for (const s of sales) {
    const items = await offlineDb.saleItems.where({ sale_id: s.id }).toArray();
    result.push({
      id: s.id,
      total_amount: s.total_amount,
      payment_method: s.payment_method,
      transaction_id: s.transaction_id,
      created_at: s.created_at,
      items,
    });
  }
  return result;
}
