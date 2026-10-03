# 🚀 PLAN MAESTRO DE DESARROLLO: "TASKS" (Gestor de Tareas)

> **INSTRUCCIÓN PARA EL ASISTENTE / AGENTE QUE EJECUTARÁ ESTE PLAN:**  
> Este proyecto debe replicar exactamente la estética visual minimalista, el sistema de cristal translúcido (*glassmorphism*), la arquitectura técnica y los componentes de la aplicación ubicada en `c:\Users\Usuario\Documents\Proyectos\habits` (o `../habits`).  
> **Antes de escribir código en cada fase, DEBES revisar los archivos de referencia en `habits` indicados en cada sección.**

---

## 📑 ÍNDICE GENERAL

1. [Visión General y Diferencias con Habits](#1-visión-general-y-diferencias-con-habits)
2. [Stack Tecnológico y Archivos de Referencia](#2-stack-tecnológico-y-archivos-de-referencia)
3. [Sistema de Diseño e Identidad Visual (Nuevo Color Primario)](#3-sistema-de-diseño-e-identidad-visual-nuevo-color-primario)
4. [Estructura del Proyecto (`tasks`)](#4-estructura-del-proyecto-tasks)
5. [Esquema de Base de Datos y Supabase SQL](#5-esquema-de-base-de-datos-y-supabase-sql)
6. [Modelos de Datos y Tipos TypeScript (`lib/types.ts`)](#6-modelos-de-datos-y-tipos-typescript-libtypests)
7. [Motor de Racha Diaria Global (`lib/streak.ts`)](#7-motor-de-racha-diaria-global-libstreakts)
8. [Motor de Encadenamiento de Tareas / Pipelines (`lib/chains.ts`)](#8-motor-de-encadenamiento-de-tareas--pipelines-libchainsts)
9. [Fases de Desarrollo Paso a Paso](#9-fases-de-desarrollo-paso-a-paso)
   - [Fase 1: Configuración, Design System, Base de Datos y Auth](#fase-1-configuración-design-system-base-de-datos-y-auth)
   - [Fase 2: Layout Principal, Navegación y Racha en Header](#fase-2-layout-principal-navegación-y-racha-en-header)
   - [Fase 3: Listas y Tareas (CRUD Core, Acciones y Modales Glass)](#fase-3-listas-y-tareas-crud-core-acciones-y-modales-glass)
   - [Fase 4: Vistas Temporales (Hoy, 7 Días, Todas) y Toolbar de Filtros](#fase-4-vistas-temporales-hoy-7-días-todas-y-toolbar-de-filtros)
   - [Fase 5: Matriz de Eisenhower y Vista Calendario](#fase-5-matriz-de-eisenhower-y-vista-calendario)
   - [Fase 6: Encadenamiento Secuencial y Pipeline Modal](#fase-6-encadenamiento-secuencial-y-pipeline-modal)
   - [Fase 7: Microinteracciones, PWA y Ajustes Finales](#fase-7-microinteracciones-pwa-y-ajustes-finales)
10. [Prompts Listos para Enviar por Fases](#10-prompts-listos-para-enviar-por-fases)

---

## 1. VISIÓN GENERAL Y DIFERENCIAS CON HABITS

| Aspecto | `habits` | `Tasks` (Nueva Web) |
|---|---|---|
| **Propósito** | Seguimiento de hábitos y rachas individuales | Gestor integral de tareas y productividad diaria |
| **Color Primario** | Esmeralda (`#059669` / `#34d399`) | **Azul Cobalto Eléctrico** (`#2563eb` / `#60a5fa`) |
| **Sección de Reportes** | `/informes` (Heatmap editable, compliance 30d) | **NO DEBE TENER REPORTES** (Completamente omitido) |
| **Mecánica de Racha** | Por hábito individual según `days_active` | **Racha global única**: se suma si el usuario completó **al menos 1 tarea hoy** |
| **Encadenamiento** | Encadenar hábitos ($A \to B$) con pipeline modal | **Encadenamiento de tareas** ($T_A \to T_B$): workflows secuenciales con pipeline modal |
| **Vistas Principales** | Hoy, Hábitos, Informes, Ajustes | **Hoy**, **Siguientes 7 Días**, **Todas / Listas**, **Matriz Eisenhower**, **Calendario**, **Ajustes** |
| **Filtros / Ordenación** | Búsqueda básica | Filtro global y por lista, orden por fecha/prioridad, switch ver/ocultar completadas |

---

## 2. STACK TECNOLÓGICO Y ARCHIVOS DE REFERENCIA

### Stack (Idéntico a `habits`)
- **Framework:** Next.js 16 (App Router) + TypeScript 5
- **UI & Componentes:** HeroUI v3 (`@heroui/react`, `@heroui/styles`)
- **Estilos:** Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Iconos:** Lucide React (`lucide-react`)
- **Animaciones:** Framer Motion (`framer-motion`)
- **Backend & Auth:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **Validación:** Zod (`zod`)

### Archivos de Referencia Obligatoria en `habits`
- `habits/app/globals.css`: Sistema completo de Glassmorphism (`.glass-panel`, `.glass-input`, `.glass-btn`, `.glass-pill`, etc.) y scrollbars.
- `habits/components/glass-modal.tsx`: Modal base flotante con efecto blur y foco accesible.
- `habits/components/delete-modal.tsx`: Modal de confirmación con estilo glass.
- `habits/components/streak-badge.tsx`: Insignia de racha con llama y contador numérico.
- `habits/components/chain-pipeline-modal.tsx`: Visualizador horizontal de nodos encadenados con flechas conectoras.
- `habits/components/color-picker.tsx` e `icon-picker.tsx`: Selectores visuales interactivos.
- `habits/components/searchable-select.tsx`: Selector desplegable con búsqueda integrada.
- `habits/components/app-nav.tsx` y `app-shell.tsx`: Cabecera sticky con tabs y contenedor responsivo.
- `habits/lib/streak.ts`: Lógica matemática de evaluación de días consecutivos.
- `habits/lib/chains.ts`: Algoritmo para resolver grafos de cadenas directas y detectar ciclos.
- `habits/supabase/schema.sql`: Implementación de trigger PL/pgSQL anti-ciclos y políticas RLS.

---

## 3. SISTEMA DE DISEÑO E IDENTIDAD VISUAL (NUEVO COLOR PRIMARIO)

En `tasks/app/globals.css`, replicar las clases de `habits/app/globals.css` cambiando las variables `--accent`:

```css
@import "tailwindcss";
@import "@heroui/styles";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}

/* ═══════════════════ PALETA PRIMARIA: AZUL COBALTO ═══════════════════ */
:root {
  --accent: #2563eb;          /* Azul Cobalto Intenso */
  --accent-foreground: #ffffff;
}

.dark {
  --accent: #60a5fa;          /* Azul Cielo Luminoso */
  --accent-foreground: #091e42;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.bg-surface {
  background-color: var(--background);
  border-radius: 1rem;
  border: 1px solid var(--border);
  box-shadow: none;
  transition: all 0.2s ease-in-out;
}

.dark .bg-surface {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

.bg-surface:hover {
  box-shadow: none;
}

.dark .bg-surface:hover {
  box-shadow: none;
  border-color: rgba(255, 255, 255, 0.2);
}

/* ═══════════════════ GLASSMORPHISM SYSTEM (IDÉNTICO A HABITS) ═══════════════════ */

.glass-backdrop {
  background: rgba(0, 0, 0, 0.2);
  transition: opacity 0.2s ease;
}
.dark .glass-backdrop {
  background: rgba(0, 0, 0, 0.28);
}

.glass-panel {
  position: relative;
  border-radius: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(32px) saturate(1.6);
  background: rgba(255, 255, 255, 0.32);
}
.dark .glass-panel {
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5),
              inset 0 1px 0 rgba(255, 255, 255, 0.15);
  background: rgba(22, 24, 32, 0.22);
}

.glass-dropdown {
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(28px) saturate(1.6);
  background: rgba(255, 255, 255, 0.48);
}
.dark .glass-dropdown {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(22, 24, 32, 0.45);
}

.glass-input {
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.75rem;
  transition: all 0.15s ease;
}
.glass-input:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent) 20%, transparent);
}
.dark .glass-input {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}
.dark .glass-input:focus-within {
  border-color: var(--accent);
}

.glass-btn {
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.75rem;
  transition: all 0.15s ease;
}
.glass-btn:hover {
  background: rgba(255, 255, 255, 0.4);
}
.dark .glass-btn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}
.dark .glass-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.glass-pill {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9999px;
  transition: all 0.15s ease;
}
.glass-pill[data-selected="true"],
.glass-pill.glass-pill-active {
  background: color-mix(in oklab, var(--accent) 25%, transparent);
  border-color: color-mix(in oklab, var(--accent) 40%, transparent);
  color: var(--accent);
}
.dark .glass-pill {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.06);
}
.dark .glass-pill[data-selected="true"],
.dark .glass-pill.glass-pill-active {
  background: color-mix(in oklab, var(--accent) 20%, transparent);
  border-color: color-mix(in oklab, var(--accent) 30%, transparent);
}

/* Scrollbars */
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.25);
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.45);
}
```

---

## 4. ESTRUCTURA DEL PROYECTO (`tasks`)

```text
tasks/
├── actions/
│   ├── auth.ts                   # Login, registro, cerrar sesión
│   ├── lists.ts                  # CRUD de listas de tareas
│   └── tasks.ts                  # CRUD de tareas, toggle completado, cadenas
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── registro/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # AppShell con AppNav y providers
│   │   ├── hoy/page.tsx          # Vista de tareas de hoy + atrasadas
│   │   ├── proximos/page.tsx     # Tareas de los siguientes 7 días
│   │   ├── tareas/page.tsx       # Todas las tareas y filtro por lista
│   │   ├── eisenhower/page.tsx   # Matriz de 4 cuadrantes
│   │   ├── calendario/page.tsx   # Vista mensual de calendario
│   │   └── ajustes/page.tsx      # Configuración de cuenta y tema
│   ├── globals.css               # Glassmorphism + temas
│   ├── layout.tsx                # Root layout con fuente Inter y Providers
│   └── page.tsx                  # Redirect inteligente (a /hoy si autenticado)
├── components/
│   ├── animated.tsx              # Wrappers de animación framer-motion
│   ├── app-nav.tsx               # Header principal con tabs y badge de racha
│   ├── app-shell.tsx             # Envoltorio responsivo con anchos máximos
│   ├── calendar-view.tsx         # Componente de cuadrícula de calendario
│   ├── category-icon.tsx         # Iconos de Lucide renderizados dinámicamente
│   ├── chain-edit-modal.tsx      # Modal para editar nombre y horario de cadena
│   ├── chain-pipeline-modal.tsx  # Vista visual de pipeline (Paso 1 → Paso 2)
│   ├── color-picker.tsx          # Selector de paleta de colores de listas
│   ├── delete-modal.tsx          # Modal glass para confirmación de borrado
│   ├── eisenhower-matrix.tsx     # Cuadrícula 2x2 interactiva de Eisenhower
│   ├── glass-modal.tsx           # Modal base con glassmorphism
│   ├── icon-picker.tsx           # Selector visual de iconos de Lucide
│   ├── list-form-modal.tsx       # Modal para crear/editar lista
│   ├── searchable-select.tsx     # Dropdown con búsqueda
│   ├── streak-badge.tsx          # Insignia de racha diaria con llama
│   ├── task-card.tsx             # Tarjeta de tarea con checkbox y badges
│   ├── task-form-modal.tsx       # Modal completo para crear/editar tarea
│   ├── task-toolbar.tsx          # Buscador, switch completadas y ordenación
│   └── theme-toggle.tsx          # Switch claro/oscuro
├── lib/
│   ├── chains.ts                 # Algoritmo de reconstrucción de cadenas
│   ├── streak.ts                 # Algoritmo de racha (>= 1 tarea hoy)
│   ├── types.ts                  # Definiciones de TypeScript
│   └── supabase/
│       ├── client.ts             # Cliente browser Supabase
│       ├── middleware.ts         # Middleware de sesión
│       └── server.ts             # Cliente server actions Supabase
├── public/
│   └── manifest.json             # Manifiesto PWA
└── supabase/
    └── schema.sql                # DDL completo, RLS y triggers anti-ciclos
```

---

## 5. ESQUEMA DE BASE DE DATOS Y SUPABASE SQL

Ejecutar este archivo completo en **Supabase > SQL Editor**:

```sql
-- tasks · esquema Supabase

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
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  
  -- Insertar lista por defecto "Bandeja de entrada"
  insert into public.task_lists (user_id, name, icon, color, position)
  values (new.id, 'Bandeja de entrada', 'inbox', '#2563eb', 0);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## 6. MODELOS DE DATOS Y TIPOS TYPESCRIPT (`lib/types.ts`)

```typescript
export type PriorityLevel = 1 | 2 | 3 | 4; // 1: Urgente, 2: Alta, 3: Media, 4: Baja

export type TaskStatus = "pending" | "completed";

export type TaskList = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  position: number;
  created_at: string;
  task_count?: number;
};

export type Task = {
  id: string;
  user_id: string;
  list_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;      // "YYYY-MM-DD"
  due_time: string | null;      // "HH:mm"
  priority: PriorityLevel;
  is_urgent: boolean;
  is_important: boolean;
  status: TaskStatus;
  completed_at: string | null;  // ISO string
  next_task_id: string | null;
  chain_name: string | null;
  chain_time: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type TaskChain = {
  id: string;
  headId: string;
  name: string;
  time?: string | null;
  tasks: Task[];
};

export type Streak = {
  current: number;
  best: number;
  todayPending: boolean;
  todayCovered: boolean;
};

export type SortOption = "due_date" | "priority" | "title" | "created_at";
```

---

## 7. MOTOR DE RACHA DIARIA GLOBAL (`lib/streak.ts`)

> **REGLA ESPECÍFICA:**  
> A diferencia de los hábitos, esta racha es una métrica de productividad diaria unificada:  
> **Se suma +1 por cada día en que se completó al menos una tarea.**

```typescript
import { Streak } from "./types";

function prevDayISO(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calcula la racha diaria global basada en fechas donde se completó >= 1 tarea.
 * 
 * @param completedDatesSet Conjunto de strings "YYYY-MM-DD" con actividad completada.
 * @param todayISO Fecha local actual en formato "YYYY-MM-DD".
 */
export function computeGlobalTaskStreak(
  completedDatesSet: Set<string>,
  todayISO: string
): Streak {
  const todayCovered = completedDatesSet.has(todayISO);
  const todayPending = !todayCovered;

  // 1. Racha actual
  let current = 0;
  let cursor = todayCovered ? todayISO : prevDayISO(todayISO);

  while (completedDatesSet.has(cursor)) {
    current += 1;
    cursor = prevDayISO(cursor);
  }

  // 2. Mejor racha histórica (Best Streak)
  const sortedDates = Array.from(completedDatesSet).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;

  for (const date of sortedDates) {
    if (!prev) {
      run = 1;
    } else {
      const expectedNext = new Date(prev + "T12:00:00");
      expectedNext.setDate(expectedNext.getDate() + 1);
      const expectedISO = expectedNext.toISOString().slice(0, 10);

      if (date === expectedISO) {
        run += 1;
      } else {
        run = 1;
      }
    }
    if (run > best) best = run;
    prev = date;
  }

  if (current > best) best = current;

  return { current, best, todayPending, todayCovered };
}
```

---

## 8. MOTOR DE ENCADENAMIENTO DE TAREAS / PIPELINES (`lib/chains.ts`)

Adaptación del algoritmo de `habits/lib/chains.ts` para tareas:

```typescript
import { Task, TaskChain } from "./types";

/**
 * Reconstruye las secuencias encadenadas de tareas (Task A -> Task B -> Task C).
 */
export function buildTaskChains(tasks: Task[]): TaskChain[] {
  const allById = new Map(tasks.map((t) => [t.id, t]));
  const targetedIds = new Set<string>();

  for (const t of tasks) {
    if (t.next_task_id && allById.has(t.next_task_id)) {
      targetedIds.add(t.next_task_id);
    }
  }

  const chains: TaskChain[] = [];
  const visited = new Set<string>();

  // Cabezas de cadena (tareas que tienen next_task_id pero ninguna otra apunta a ellas)
  const heads = tasks.filter(
    (t) => !targetedIds.has(t.id) && t.next_task_id && allById.has(t.next_task_id)
  );

  for (const head of heads) {
    if (visited.has(head.id)) continue;
    const chainTasks: Task[] = [head];
    const inChain = new Set<string>([head.id]);
    let curr = head;

    while (curr.next_task_id && allById.has(curr.next_task_id)) {
      const nextT = allById.get(curr.next_task_id)!;
      if (inChain.has(nextT.id) || visited.has(nextT.id)) break;
      chainTasks.push(nextT);
      inChain.add(nextT.id);
      curr = nextT;
    }

    if (chainTasks.length > 1) {
      chainTasks.forEach((t) => visited.add(t.id));
      chains.push({
        id: `chain-${head.id}`,
        headId: head.id,
        name: head.chain_name || `${head.title} → ...`,
        time: head.chain_time,
        tasks: chainTasks,
      });
    }
  }

  return chains;
}
```

---

## 9. FASES DE DESARROLLO PASO A PASO

### FASE 1: Configuración, Design System, Base de Datos y Auth
- **Meta:** Proyecto Next.js 16 funcional con Tailwind v4, HeroUI v3, estilos glass idénticos a `habits` con acento azul, esquema Supabase desplegado y login/registro operativo.
- **Acciones:**
  1. Instalar dependencias exactas según `habits/package.json`.
  2. Crear `app/globals.css` con el sistema de cristal translúcido y las variables `--accent: #2563eb;` (`#60a5fa` en dark).
  3. Ejecutar el script SQL de la sección 5 en Supabase.
  4. Configurar `lib/supabase/client.ts`, `server.ts` y `middleware.ts`.
  5. Crear las páginas de autenticación `/login` y `/registro` copiando el diseño de `habits/components/auth-form.tsx`.
- **Criterio de Aceptación:** El usuario puede registrarse e iniciar sesión; se crea su perfil y la lista "Bandeja de entrada" automáticamente en Supabase; los estilos glass responden a tema claro y oscuro.

---

### FASE 2: Layout Principal, Navegación y Racha en Header
- **Meta:** Shell principal responsivo con barra de navegación superior, cambio de tema y la insignia interactiva de racha.
- **Acciones:**
  1. Implementar `lib/streak.ts` según la sección 7.
  2. Implementar `components/streak-badge.tsx` (basado en `habits/components/streak-badge.tsx`):
     - Llama encendida si `todayCovered` es true; llama tenue si `todayPending`.
     - Tooltip con: Racha actual y récord personal.
  3. Implementar `components/app-nav.tsx`:
     - Pestañas: `/hoy`, `/proximos`, `/tareas`, `/eisenhower`, `/calendario`.
     - Selector de tema (`ThemeToggle`).
     - Badge de racha (`StreakBadge`).
     - Menú de perfil y botón de desconexión.
  4. Crear `components/app-shell.tsx` con contenedores responsivos max-width fluidos.
  5. Asegurar que **no exista ninguna ruta ni botón a `/informes`**.
- **Criterio de Aceptación:** La barra superior se mantiene visible (*sticky*), la navegación por pestañas funciona, el cambio de tema es fluido y la racha refleja si hay tareas completadas hoy.

---

### FASE 3: Listas y Tareas (CRUD Core, Acciones y Modales Glass)
- **Meta:** Creación y edición completa de listas personalizadas y tareas con modales glassmórficos.
- **Acciones:**
  1. Portar `components/glass-modal.tsx`, `components/delete-modal.tsx`, `components/color-picker.tsx` e `icon-picker.tsx` desde `habits`.
  2. Crear `actions/lists.ts`: `createList`, `updateList`, `deleteList`.
  3. Crear `components/list-form-modal.tsx`: formulario con nombre, paleta de colores e icono de Lucide.
  4. Crear `actions/tasks.ts`: `createTask`, `updateTask`, `toggleTaskStatus`, `deleteTask`.
  5. Crear `components/task-form-modal.tsx`:
     - Título y descripción (textarea multilínea).
     - Selector de lista (dropdown glass).
     - Fecha (`due_date`) y hora (`due_time`).
     - Selector de prioridad P1 a P4 (con colores representativos).
     - Switches de matriz: ¿Es urgente? ¿Es importante?
     - Selector para encadenar: "¿Siguiente tarea a realizar?" (`next_task_id`).
  6. Crear `components/task-card.tsx`:
     - Checkbox redondeado interactivo.
     - Título tachado si está completada.
     - Badges de prioridad, fecha límite y lista.
     - Botón de opciones (editar, eliminar, ver cadena).
- **Criterio de Aceptación:** Crear una lista personalizada con color e icono; crear tareas asignadas a listas con fecha y prioridad; marcar como completada actualiza el estado optimistamente.

---

### FASE 4: Vistas Temporales (Hoy, 7 Días, Todas) y Toolbar de Filtros
- **Meta:** Vistas de gestión diaria y semanal con barra de herramientas para búsqueda y filtrado.
- **Acciones:**
  1. Crear `components/task-toolbar.tsx`:
     - Input de búsqueda en tiempo real (filtra por texto en título y descripción).
     - Switch `Ver completadas`: toggle para mostrar u ocultar tareas finalizadas.
     - Dropdown de ordenación: Por fecha límite, por prioridad o por nombre.
     - Filtro por lista actual.
  2. Implementar `/hoy/page.tsx`:
     - Filtra tareas con `due_date = today` y tareas atrasadas pendientes (`due_date < today and status = 'pending'`).
     - Sección destacada para tareas atrasadas.
  3. Implementar `/proximos/page.tsx`:
     - Bloques agrupados por día para los siguientes 7 días (`today + 1` hasta `today + 7`).
     - Cada día muestra su fecha relativa ("Mañana", "Lunes 5", etc.) y contador de tareas.
  4. Implementar `/tareas/page.tsx`:
     - Vista completa de todas las tareas.
     - Barra lateral o pestañas de listas para filtrar por lista específica o ver "Todas".
  5. Implementar vista/modal de tareas completadas archivadas con opción de desmarcar o limpiar.
- **Criterio de Aceptación:** El switch oculta/muestra tareas completadas en tiempo real; el buscador filtra instantáneamente; las vistas `/hoy` y `/proximos` organizan las fechas con exactitud.

---

### FASE 5: Matriz de Eisenhower y Vista Calendario
- **Meta:** Implementar los cuadrantes de toma de decisiones y el planificador visual mensual.
- **Acciones:**
  1. Implementar `/eisenhower/page.tsx` (`components/eisenhower-matrix.tsx`):
     - Grid $2 \times 2$ en paneles `.glass-panel`:
       - **Q1: Urgente + Importante** (Hacer Ahora) — Acento Rojo.
       - **Q2: No Urgente + Importante** (Programar) — Acento Azul/Cobalto.
       - **Q3: Urgente + No Importante** (Delegar) — Acento Ámbar/Naranja.
       - **Q4: No Urgente + No Importante** (Eliminar) — Acento Slate/Muted.
     - Botón `+` en cada cuadrante para agregar tarea pre-clasificada.
     - Menú contextual rápido para mover una tarea a otro cuadrante.
  2. Implementar `/calendario/page.tsx` (`components/calendar-view.tsx`):
     - Grilla mensual con días de lunes a domingo.
     - Indicadores (puntos de color) por tarea pendiente y completada.
     - Clic en cualquier celda de día abre un panel inferior/modal con las tareas de esa fecha y botón para añadir tarea en esa fecha exacta.
- **Criterio de Aceptación:** La matriz clasifica automáticamente según los booleanos `is_urgent` e `is_important`; el calendario permite navegar por meses y ver/crear tareas por día.

---

### FASE 6: Encadenamiento Secuencial y Pipeline Modal
- **Meta:** Flujos de trabajo donde completar una tarea activa o sugiere la siguiente en una cadena ordenada.
- **Acciones:**
  1. Implementar `lib/chains.ts` según la sección 8.
  2. Adaptar `components/chain-pipeline-modal.tsx` desde `habits/components/chain-pipeline-modal.tsx`:
     - Modal ancho con scroll horizontal suave (`custom-scrollbar`).
     - Nodos visuales de tareas (Paso 1, Paso 2, Paso 3...) conectados con flechas `ArrowRight`.
     - Muestra el nombre de la rutina (`chain_name`) y hora (`chain_time`).
  3. Crear `components/chain-edit-modal.tsx` para configurar metadatos de la cadena.
  4. Experiencia de flujo en `task-card.tsx` y `/hoy`:
     - Al completar una tarea que posee `next_task_id`, emitir toast/modal interactivo: *"Paso completado. Siguiente paso sugerido: [Nombre de la siguiente tarea]"* con botón directo para enfocarla o abrirla.
  5. Asegurar que el trigger de Postgres `prevent_task_cycle` rechaza referencias circulares.
- **Criterio de Aceptación:** Se pueden encadenar varias tareas secuencialmente; el modal visual muestra el pipeline completo con flechas; completar una tarea guía hacia la siguiente.

---

### FASE 7: Microinteracciones, PWA y Ajustes Finales
- **Meta:** Perfeccionamiento visual, soporte offline básico e instalación PWA.
- **Acciones:**
  1. Animaciones suaves con `framer-motion` para entrada y salida de tareas.
  2. Configurar `public/manifest.json` para PWA:
     - Nombre: `Tasks`.
     - Color de fondo y tema: `#091e42` y `#2563eb`.
     - Iconos adaptativos en `public/icons/`.
  3. Registrar service worker con `components/sw-register.tsx`.
  4. Página `/ajustes`: edición de nombre de usuario, cambio de tema, exportación de datos básica y zona de peligro (eliminar cuenta).
  5. Auditoría de build: `npm run build` sin errores de TypeScript ni advertencias de linting.
- **Criterio de Aceptación:** La app es instalable como PWA en móvil y escritorio, transiciona suavemente y no tiene enlaces rotos ni dependencias de reportes.

---

## 10. PROMPTS LISTOS PARA ENVIAR POR FASES

Usa estos bloques de texto para enviarlos uno por uno al nuevo chat de desarrollo:

### ✉️ PROMPT DE INICIO (Enviar primero)
```text
Hola. Vamos a desarrollar una aplicación web de productividad llamada "Tasks".
Es un gestor de tareas que debe tener EXACTAMENTE la misma estética visual glassmórfica, arquitectura y calidad técnica que el proyecto existente ubicado en:
c:\Users\Usuario\Documents\Proyectos\habits

Antes de empezar, ten en cuenta las directrices esenciales:
1. Revisa la carpeta habits para guiarte en el estilo visual, clases CSS (.glass-panel, .glass-input, etc.) y componentes similares.
2. El color primario debe ser AZUL COBALTO (--accent: #2563eb en claro, #60a5fa en oscuro) en lugar del verde esmeralda de habits.
3. La web NO debe tener informes ni reportes.
4. Debe tener una racha global única que se incremente en +1 si se completó al menos una tarea hoy.
5. Debe permitir encadenar tareas secuencialmente (con vista de pipeline modal), matriz de Eisenhower, calendario, listas, prioridades y filtros.

Por favor, confirma que comprendes estas bases y procederemos con la Fase 1.
```

### ✉️ PROMPT PARA FASE 1
```text
Iniciemos con la FASE 1: Configuración, Design System, Base de Datos y Auth.
1. Configura el proyecto Next.js 16 con HeroUI v3, Tailwind CSS v4, Lucide React y Framer Motion (revisa habits/package.json).
2. En app/globals.css replica el sistema Glassmorphism de habits/app/globals.css aplicando el acento azul cobalto (#2563eb / #60a5fa).
3. Despliega el esquema SQL completo de Supabase: perfiles, task_lists, tasks (con next_task_id, prioridad, flags de Eisenhower, etc.), el trigger PL/pgSQL anti-ciclos y las políticas RLS.
4. Implementa la autenticación con Supabase SSR (/login, /registro y middleware de sesión) con el mismo estilo visual de habits/components/auth-form.tsx.

Genera los archivos necesarios y asegúrate de que el login y registro funcionen.
```

### ✉️ PROMPT PARA FASE 2
```text
Continuemos con la FASE 2: Layout Principal, Navegación y Motor de Racha.
1. Implementa lib/streak.ts: la racha se calcula evaluando los días consecutivos en los que se completó >= 1 tarea. Retorna { current, best, todayPending, todayCovered }.
2. Crea components/streak-badge.tsx basándote en habits/components/streak-badge.tsx para mostrar el fuego 🔥 en la cabecera.
3. Construye components/app-nav.tsx y app-shell.tsx basándote en habits/components/app-nav.tsx:
   - Header sticky con efecto blur.
   - Pestañas: /hoy, /proximos, /tareas, /eisenhower, /calendario.
   - StreakBadge, selector de tema claro/oscuro y perfil.
   - IMPORTANTE: No incluyas enlaces ni vistas a /informes.
```

### ✉️ PROMPT PARA FASE 3
```text
Continuemos con la FASE 3: Listas y Tareas (CRUD Core y Modales Glass).
1. Porta components/glass-modal.tsx, delete-modal.tsx, color-picker.tsx e icon-picker.tsx desde habits.
2. Implementa Server Actions para listas (actions/lists.ts) y tareas (actions/tasks.ts).
3. Diseña el modal components/task-form-modal.tsx con: título, descripción multilínea, selector de lista, fecha límite, hora, prioridad (P1-P4), checks de urgencia e importancia (Eisenhower) y selector de siguiente tarea (next_task_id).
4. Diseña components/task-card.tsx con optimistic updates al marcar tareas como completadas.
```

### ✉️ PROMPT PARA FASE 4
```text
Continuemos con la FASE 4: Vistas Temporales y Barra de Filtrado.
1. Construye components/task-toolbar.tsx:
   - Buscador por texto en tiempo real.
   - Switch para mostrar u ocultar completadas.
   - Ordenación por fecha límite, prioridad o título.
2. Implementa la vista /hoy: tareas de hoy + tareas atrasadas pendientes.
3. Implementa la vista /proximos: desglose agrupado de los siguientes 7 días.
4. Implementa la vista /tareas: listado general con filtro interactivo por listas.
5. Agrega la sección o filtro rápido para consultar el historial de tareas completadas.
```

### ✉️ PROMPT PARA FASE 5
```text
Continuemos con la FASE 5: Matriz de Eisenhower y Vista Calendario.
1. En /eisenhower: crea la matriz de 4 cuadrantes (Hacer ya, Programar, Delegar, Eliminar) en paneles .glass-panel con colores distintivos, visualización de tareas y creación rápida por cuadrante.
2. En /calendario: crea la cuadrícula mensual con indicadores de tareas y modal lateral para ver y añadir tareas en el día seleccionado.
```

### ✉️ PROMPT PARA FASE 6
```text
Continuemos con la FASE 6: Encadenamiento Secuencial de Tareas (Pipelines).
1. Implementa lib/chains.ts adaptando el algoritmo de reconstrucción de cadenas de habits/lib/chains.ts.
2. Adapta components/chain-pipeline-modal.tsx de habits para visualizar el pipeline de tareas horizontal con tarjetas y flechas conectoras.
3. Añade la interacción: al completar una tarea con next_task_id, sugiere al usuario avanzar a la siguiente tarea de la cadena.
```

### ✉️ PROMPT PARA FASE 7
```text
Finalicemos con la FASE 7: Microinteracciones, PWA y Ajustes.
1. Añade transiciones fluidas con Framer Motion (check de completado y cambios de pestañas).
2. Configura public/manifest.json y components/sw-register.tsx para PWA instalable con tema azul cobalto.
3. Crea la página /ajustes (perfil, tema, peligro).
4. Verifica que no existan errores de compilación ni rastros de reportes.
```
