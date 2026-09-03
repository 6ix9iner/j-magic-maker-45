-- decrement_stock was not idempotent: if the offline sync queue retried a
-- 'sale_create' item (e.g. the app is killed after the RPC succeeds but
-- before the local queue item is deleted/marked synced), stock got
-- decremented again for the same sale. The sale/sale_items inserts were
-- already safe against this (23505 duplicate-key conflicts are ignored on
-- retry, since they reuse the same client-generated id), but this RPC had
-- no equivalent guard.
--
-- Fixed by adding a small ledger keyed by sale_item_id (unique, so a
-- retried call is a guaranteed no-op after the first successful one) and
-- extending the function to accept it.

create table if not exists public.stock_decrement_ledger (
  sale_item_id uuid primary key,
  product_id uuid not null,
  sale_id uuid not null,
  qty integer not null,
  applied_at timestamptz not null default now()
);
alter table public.stock_decrement_ledger enable row level security;
-- Deliberately no policies: this table is internal bookkeeping for
-- decrement_stock (SECURITY DEFINER) only - no client role should read or
-- write it directly.

drop function if exists public.decrement_stock(uuid, integer);

create or replace function public.decrement_stock(
  p_product_id uuid,
  p_qty integer,
  p_sale_item_id uuid default null,
  p_sale_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Idempotency guard: a sync retry must never decrement the same sale
  -- item's stock twice. Callers that don't pass p_sale_item_id (none in
  -- this codebase currently do) skip the guard entirely, same as before.
  if p_sale_item_id is not null then
    insert into public.stock_decrement_ledger (sale_item_id, product_id, sale_id, qty)
    values (p_sale_item_id, p_product_id, p_sale_id, p_qty)
    on conflict (sale_item_id) do nothing;

    if not found then
      return;
    end if;
  end if;

  update public.products
  set stock_count = greatest(0, stock_count - p_qty),
      updated_at = now()
  where id = p_product_id
    and user_id = auth.uid();
end;
$$;

grant execute on function public.decrement_stock(uuid, integer, uuid, uuid) to authenticated;
