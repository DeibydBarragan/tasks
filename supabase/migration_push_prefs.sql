-- tasks · migración: preferencias de notificaciones en perfiles (Fase P2)
-- Ejecuta esto en Supabase > SQL Editor

alter table public.profiles
  add column if not exists notify_overdue boolean not null default true,
  add column if not exists notify_reminders boolean not null default true,
  add column if not exists quiet_start text null,
  add column if not exists quiet_end text null;
