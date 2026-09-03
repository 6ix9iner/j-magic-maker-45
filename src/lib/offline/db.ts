import Dexie, { Table } from 'dexie';

/**
 * Local offline database. Used ONLY on native platforms (Android/iOS) -
 * the web app always talks to Supabase directly, exactly as before. See
 * repository.ts for the platform branch.
 *
 * Every row that can be created offline carries a client-generated UUID as
 * its id from the moment it's created (see repository.ts), so there is
 * never any server-side id remapping to reconcile during sync.
 */

export interface LocalProduct {
  id: string;
  user_id: string;
  barcode: string;
  name: string;
  price: number;
  purchase_price: number;
  stock_count: number;
  category: string | null;
  created_at: string;
  updated_at: string;
  /** Row exists locally but hasn't been confirmed synced to Supabase yet. */
  pendingSync: 0 | 1;
  /** Soft-deleted locally, pending a delete sync to Supabase. */
  deleted: 0 | 1;
}

export interface LocalSale {
  id: string;
  user_id: string;
  cashier_id: string;
  total_amount: number;
  payment_method: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
  pendingSync: 0 | 1;
}

export interface LocalSaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  barcode_at_sale: string | null;
  name_at_sale: string | null;
  price_at_sale: number;
  quantity: number;
  created_at: string;
}

export interface LocalBusinessInfo {
  /** Keyed by user_id - one row per user. */
  user_id: string;
  id: string;
  business_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string | null;
  tax_id: string | null;
  thank_you_message: string | null;
  inventory_password_hash: string | null;
  sales_password_hash: string | null;
  created_at: string;
  updated_at: string;
  pendingSync: 0 | 1;
}

export type SyncOpType =
  | 'product_create'
  | 'product_update'
  | 'product_delete'
  | 'sale_create'
  | 'sale_delete'
  | 'business_info_upsert';

export interface SyncQueueItem {
  /** Auto-incrementing local queue id. */
  id?: number;
  type: SyncOpType;
  /** The local row id this operation is about (product id, sale id, ...). */
  entityId: string;
  /** Fully-formed payload ready to send to Supabase. */
  payload: any;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

class OfflineDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  sales!: Table<LocalSale, string>;
  saleItems!: Table<LocalSaleItem, string>;
  businessInfo!: Table<LocalBusinessInfo, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('myskrib_offline');
    this.version(1).stores({
      products: 'id, user_id, barcode, [user_id+barcode], deleted',
      sales: 'id, user_id, created_at',
      saleItems: 'id, sale_id, product_id',
      businessInfo: 'user_id',
      syncQueue: '++id, type, createdAt',
    });
    // v2: pullFromServer() (syncEngine.ts) queries products/sales with
    // `.where({ pendingSync: 1 })` to avoid clobbering rows with unsynced
    // local edits - but `pendingSync` was never declared as an indexed
    // field on either table in v1, so Dexie threw a SchemaError on that
    // very first query every time. That exception aborted the whole pull
    // silently (caught far upstream), which meant a device's local
    // products/sales NEVER actually refreshed from the server after their
    // initial creation - explains stale stock counts and products created
    // on another session/after a reinstall never showing up locally.
    // Dexie requires a version bump (not just editing v1's schema) to add
    // an index to an already-created store on existing installs.
    this.version(2).stores({
      products: 'id, user_id, barcode, [user_id+barcode], deleted, pendingSync',
      sales: 'id, user_id, created_at, pendingSync',
      saleItems: 'id, sale_id, product_id',
      businessInfo: 'user_id',
      syncQueue: '++id, type, createdAt',
    });
  }
}

export const offlineDb = new OfflineDatabase();
