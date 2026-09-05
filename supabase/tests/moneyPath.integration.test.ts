import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Integration tests for the two Postgres RPCs where a bug has a real dollar
// cost: decrement_stock (a double-decrement here shorted a real user's
// inventory before the idempotency ledger was added) and delete_sale
// (must restore stock and must not let one user delete another's sale).
//
// These call the LIVE Supabase project as a real authenticated user, so
// they need a dedicated, disposable test account - never run this against
// an account that has real business data. See supabase/tests/README.md.
//
// Skipped entirely (not failed) when credentials aren't provided, so
// `npm test` / the default CI job never depends on them.
const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;

const hasCredentials = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && TEST_USER_EMAIL && TEST_USER_PASSWORD
);

async function makeTestProduct(supabase: SupabaseClient, userId: string, stock: number) {
  const { data, error } = await supabase
    .from("products")
    .insert({
      user_id: userId,
      name: "__TEST_PRODUCT__ (safe to delete)",
      barcode: `TEST-${crypto.randomUUID()}`,
      price: 100,
      purchase_price: 50,
      stock_count: stock,
      category: "__test__",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function getStock(supabase: SupabaseClient, productId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("stock_count")
    .eq("id", productId)
    .single();
  if (error) throw error;
  return data.stock_count as number;
}

describe.runIf(hasCredentials)("money-path integration tests", () => {
  let supabase: SupabaseClient;
  let userId: string;

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL!,
      password: TEST_USER_PASSWORD!,
    });
    if (error) throw error;
    userId = data.user.id;
  });

  afterAll(async () => {
    // Belt-and-braces cleanup in case an assertion failed mid-test and a
    // per-test afterEach didn't get to run.
    await supabase.from("products").delete().eq("user_id", userId).eq("category", "__test__");
    await supabase.auth.signOut();
  });

  describe("decrement_stock", () => {
    it("is idempotent for a repeated sale_item_id (simulates an offline sync retry re-sending the same op)", async () => {
      const productId = await makeTestProduct(supabase, userId, 10);
      const saleId = crypto.randomUUID();
      const saleItemId = crypto.randomUUID();

      try {
        const { error: firstCallError } = await supabase.rpc("decrement_stock", {
          p_product_id: productId,
          p_qty: 3,
          p_sale_item_id: saleItemId,
          p_sale_id: saleId,
        });
        expect(firstCallError).toBeNull();
        expect(await getStock(supabase, productId)).toBe(7);

        // The critical assertion: replaying the exact same sale_item_id
        // must NOT decrement stock a second time.
        const { error: retryError } = await supabase.rpc("decrement_stock", {
          p_product_id: productId,
          p_qty: 3,
          p_sale_item_id: saleItemId,
          p_sale_id: saleId,
        });
        expect(retryError).toBeNull();
        expect(await getStock(supabase, productId)).toBe(7);
      } finally {
        await supabase.from("stock_decrement_ledger").delete().eq("sale_item_id", saleItemId);
        await supabase.from("products").delete().eq("id", productId);
      }
    });

    it("still decrements for a genuinely different sale_item_id on the same product", async () => {
      const productId = await makeTestProduct(supabase, userId, 10);
      const saleId = crypto.randomUUID();
      const itemA = crypto.randomUUID();
      const itemB = crypto.randomUUID();

      try {
        await supabase.rpc("decrement_stock", { p_product_id: productId, p_qty: 2, p_sale_item_id: itemA, p_sale_id: saleId });
        await supabase.rpc("decrement_stock", { p_product_id: productId, p_qty: 5, p_sale_item_id: itemB, p_sale_id: saleId });
        expect(await getStock(supabase, productId)).toBe(3);
      } finally {
        await supabase.from("stock_decrement_ledger").delete().in("sale_item_id", [itemA, itemB]);
        await supabase.from("products").delete().eq("id", productId);
      }
    });

    it("never takes stock below zero", async () => {
      const productId = await makeTestProduct(supabase, userId, 2);
      const saleItemId = crypto.randomUUID();
      try {
        const { error } = await supabase.rpc("decrement_stock", {
          p_product_id: productId,
          p_qty: 50,
          p_sale_item_id: saleItemId,
          p_sale_id: crypto.randomUUID(),
        });
        expect(error).toBeNull();
        expect(await getStock(supabase, productId)).toBe(0);
      } finally {
        await supabase.from("stock_decrement_ledger").delete().eq("sale_item_id", saleItemId);
        await supabase.from("products").delete().eq("id", productId);
      }
    });
  });

  describe("delete_sale", () => {
    it("restores stock and removes the sale + its line items", async () => {
      const productId = await makeTestProduct(supabase, userId, 10);
      const saleItemId = crypto.randomUUID();
      let saleId: string | undefined;

      try {
        const { data: sale, error: saleError } = await supabase
          .from("sales")
          .insert({ user_id: userId, total_amount: 300 })
          .select("id")
          .single();
        expect(saleError).toBeNull();
        saleId = sale!.id as string;

        const { error: itemError } = await supabase.from("sale_items").insert({
          id: saleItemId,
          sale_id: saleId,
          product_id: productId,
          name_at_sale: "__TEST_PRODUCT__",
          price_at_sale: 100,
          quantity: 3,
        });
        expect(itemError).toBeNull();

        await supabase.rpc("decrement_stock", {
          p_product_id: productId,
          p_qty: 3,
          p_sale_item_id: saleItemId,
          p_sale_id: saleId,
        });
        expect(await getStock(supabase, productId)).toBe(7);

        const { error: deleteError } = await supabase.rpc("delete_sale", { p_sale_id: saleId });
        expect(deleteError).toBeNull();

        expect(await getStock(supabase, productId)).toBe(10);

        const { data: remainingItems } = await supabase.from("sale_items").select("id").eq("sale_id", saleId);
        expect(remainingItems).toHaveLength(0);

        const { data: remainingSale } = await supabase.from("sales").select("id").eq("id", saleId).maybeSingle();
        expect(remainingSale).toBeNull();
      } finally {
        await supabase.from("stock_decrement_ledger").delete().eq("sale_item_id", saleItemId);
        if (saleId) {
          await supabase.from("sale_items").delete().eq("sale_id", saleId);
          await supabase.from("sales").delete().eq("id", saleId);
        }
        await supabase.from("products").delete().eq("id", productId);
      }
    });

    it("is a safe no-op for a sale id that doesn't exist (a retried offline delete after the first one already synced)", async () => {
      const { error } = await supabase.rpc("delete_sale", { p_sale_id: crypto.randomUUID() });
      expect(error).toBeNull();
    });
  });
});

if (!hasCredentials) {
  describe.skip("money-path integration tests (skipped)", () => {
    it("set TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, TEST_USER_EMAIL, TEST_USER_PASSWORD to run - see supabase/tests/README.md", () => {});
  });
}
