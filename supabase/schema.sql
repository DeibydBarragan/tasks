-- tasks · esquema Supabase
-- Ejecuta esto en Supabase > SQL Editor

-- 1. Perfiles de usuario
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz default now()
);

-- 2. Listas de tareas (Proyectos / Categorías)
create table if not exists public.task_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'folder',
  color text not null default '#2563eb',
  position int not null default 0,
  created_at timestamptz default now(),
  unique(user_id, name)
);

-- 3. Tareas
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id uuid references public.task_lists(id) on delete set null,
  title text not null,
  description text null,
  due_date date null,
  due_time text null,
  priority smallint not null default 4 check (priority between 1 and 4), -- 1: Urgente, 2: Alta, 3: Media, 4: Baja
  is_urgent boolean not null default false,
  is_important boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  completed_at timestamptz null,
  next_task_id uuid references public.tasks(id) on delete set null,
  chain_name text null,
  chain_time text null,
  checklist jsonb not null default '[]'::jsonb,
  estimated_hours numeric null check (estimated_hours is null or estimated_hours >= 0),
  position int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (next_task_id is null or next_task_id <> id)
);

-- Índices de alto rendimiento para filtros rápidos
create index if not exists tasks_user_status_idx on public.tasks(user_id, status);
create index if not exists tasks_user_due_date_idx on public.tasks(user_id, due_date);
create index if not exists tasks_user_list_idx on public.tasks(user_id, list_id);
create index if not exists tasks_completed_at_idx on public.tasks(user_id, completed_at) where status = 'completed';

-- 4. Habilitar RLS
alter table public.profiles enable row level security;
alter table public.task_lists enable row level security;
alter table public.tasks enable row level security;

-- Políticas de seguridad RLS
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own task_lists" on public.task_lists;
create policy "own task_lists" on public.task_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own tasks" on public.tasks;
create policy "own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Disparador anti-ciclos en encadenamiento de tareas A -> B -> A
create or replace function public.prevent_task_cycle()
returns trigger language plpgsql as $$
declare
  cur uuid;
  depth int := 0;
begin
  if new.next_task_id is null then return new; end if;
  if new.next_task_id = new.id then
    raise exception 'cycle: self reference';
  end if;
  cur := new.next_task_id;
  while cur is not null and depth < 50 loop
    if cur = new.id then
      raise exception 'cycle: chain returns to task';
    end if;
    select next_task_id into cur from public.tasks where id = cur;
    depth := depth + 1;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_prevent_task_cycle on public.tasks;
create trigger trg_prevent_task_cycle
  before insert or update of next_task_id on public.tasks
  for each row execute function public.prevent_task_cycle();

-- 6. Disparador para auto-crear perfil al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  -- Insertar lista por defecto "Bandeja de entrada"
  insert into public.task_lists (user_id, name, icon, color, position)
  values (new.id, 'Bandeja de entrada', 'inbox', '#2563eb', 0)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 7. Borrado de cuenta por el propio usuario
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_my_account() to authenticated;


-- 8. Sesiones de enfoque (timer estilo Toggl)
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
