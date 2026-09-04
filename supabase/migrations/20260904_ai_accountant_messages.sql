-- Persists the AI Business Accountant chat so a user can leave the screen
-- and come back to their conversation instead of starting over each time.
create table if not exists public.ai_accountant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender text not null check (sender in ('user', 'ai')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_accountant_messages enable row level security;

create index if not exists ai_accountant_messages_user_created_idx
  on public.ai_accountant_messages (user_id, created_at);

create policy "Users can view their own AI accountant messages"
  on public.ai_accountant_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert their own AI accountant messages"
  on public.ai_accountant_messages for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own AI accountant messages"
  on public.ai_accountant_messages for delete
  using (auth.uid() = user_id);
