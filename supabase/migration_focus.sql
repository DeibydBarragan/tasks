-- tasks · migración: sesiones de enfoque (timer estilo Toggl)
-- Ejecuta esto en Supabase > SQL Editor (solo si ya aplicaste schema.sql antes)

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  list_id uuid references public.task_lists(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  duration_seconds int null,
  note text null,
  created_at timestamptz default now()
);

create index if not exists focus_user_started_idx on public.focus_sessions(user_id, started_at desc);
create index if not exists focus_user_open_idx on public.focus_sessions(user_id) where ended_at is null;

alter table public.focus_sessions enable row level security;

drop policy if exists "own focus" on public.focus_sessions;
create policy "own focus" on public.focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
