-- tasks · migración: checklist interno por tarea
-- Ejecuta esto en Supabase > SQL Editor (solo si ya aplicaste schema.sql antes)

alter table public.tasks
  add column if not exists checklist jsonb not null default '[]'::jsonb;
