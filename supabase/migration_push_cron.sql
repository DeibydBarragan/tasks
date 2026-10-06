-- tasks · migración: recordatorio diario de vencidas + zona horaria (Fase P4)
-- Ejecuta esto en Supabase > SQL Editor

alter table public.tasks
  add column if not exists last_reminded_at timestamptz null;

alter table public.profiles
  add column if not exists notify_tz text null;
