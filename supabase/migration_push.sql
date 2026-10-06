-- tasks · migración: push + recordatorios (Fase P1)
-- Ejecuta esto en Supabase > SQL Editor

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

create table if not exists public.task_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  remind_at timestamptz not null,
  sent boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists rem_due_idx on public.task_reminders(sent, remind_at);

alter table public.push_subscriptions enable row level security;
alter table public.task_reminders enable row level security;

drop policy if exists "own push_subs" on public.push_subscriptions;
create policy "own push_subs" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own reminders" on public.task_reminders;
create policy "own reminders" on public.task_reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
