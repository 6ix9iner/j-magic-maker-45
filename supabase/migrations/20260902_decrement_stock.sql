-- Atomic stock decrement used by the offline sync engine. Applying a sale's
-- stock impact as a relative delta (instead of pushing an absolute
-- stock_count computed on-device) means two devices that sold the same
-- product while both offline don't clobber each other's count when they
-- both reconnect and sync - the deltas just add up correctly.
--
-- SECURITY DEFINER, but scoped to auth.uid() internally (never a
-- client-supplied user id) so a caller can only ever decrement their own
-- products, regardless of what runs with elevated privilege underneath.
create or replace function public.decrement_stock(p_product_id uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.products
  set stock_count = greatest(0, stock_count - p_qty),
      updated_at = now()
  where id = p_product_id
    and user_id = auth.uid();
end;
$$;

grant execute on function public.decrement_stock(uuid, integer) to authenticated;
