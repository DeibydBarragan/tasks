-- tasks · migración: tiempo estimado por tarea (horas, admite decimales)
-- Ejecuta esto en Supabase > SQL Editor (solo si ya aplicaste schema.sql antes)

alter table public.tasks
  add column if not exists estimated_hours numeric null check (estimated_hours is null or estimated_hours >= 0);
