-- Anlly Hub: perfiles con rol y módulo de nómina.
-- Ejecutar completo en Supabase > SQL Editor.

-- ─── Perfiles y roles ────────────────────────────────────────────────
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '',
  correo text not null default '',
  rol text not null default 'supervisor' check (rol in ('admin', 'supervisor')),
  creado_en timestamptz not null default now()
);

create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, correo)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', ''), coalesce(new.email, ''));
  return new;
end;
$$;

create trigger al_crear_usuario
after insert on auth.users
for each row execute function public.crear_perfil();

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;

alter table public.perfiles enable row level security;

create policy "perfil propio o admin" on public.perfiles
for select to authenticated using (id = auth.uid() or public.es_admin());

create policy "admin actualiza perfiles" on public.perfiles
for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- ─── Nómina ──────────────────────────────────────────────────────────
create table public.agentes (
  id uuid primary key default gen_random_uuid(),
  documento text not null unique,
  nombre text not null,
  salario_base numeric(14, 2) check (salario_base >= 0),
  valor_hora numeric(14, 2) check (valor_hora >= 0),
  jornada_diaria_horas numeric(4, 2) check (jornada_diaria_horas > 0),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.vigencias_recargos (
  id uuid primary key default gen_random_uuid(),
  vigente_desde date not null unique,
  inicio_nocturno time not null,
  fin_nocturno time not null,
  pct_nocturno numeric(6, 2) not null,
  pct_festivo numeric(6, 2) not null,
  pct_extra_diurna numeric(6, 2) not null,
  pct_extra_nocturna numeric(6, 2) not null,
  horas_semanales numeric(5, 2) not null check (horas_semanales > 0),
  jornada_diaria_horas numeric(4, 2) not null check (jornada_diaria_horas > 0),
  inicio_semana smallint not null default 1 check (inicio_semana between 0 and 6)
);

create table public.festivos (
  fecha date primary key,
  nombre text not null,
  origen text not null default 'manual' check (origen in ('generado', 'manual'))
);

create table public.registros_horas (
  id uuid primary key default gen_random_uuid(),
  agente_id uuid not null references public.agentes (id) on delete cascade,
  fecha date not null,
  entrada time not null,
  salida time not null,
  observacion text,
  creado_por uuid default auth.uid() references auth.users (id),
  creado_en timestamptz not null default now(),
  check (entrada <> salida)
);

create index registros_horas_agente_fecha on public.registros_horas (agente_id, fecha);
create index registros_horas_fecha on public.registros_horas (fecha);

-- Solo el admin accede a las tablas de nómina.
alter table public.agentes enable row level security;
alter table public.vigencias_recargos enable row level security;
alter table public.festivos enable row level security;
alter table public.registros_horas enable row level security;

create policy "solo admin" on public.agentes
for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "solo admin" on public.vigencias_recargos
for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "solo admin" on public.festivos
for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "solo admin" on public.registros_horas
for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Valores por defecto de Colombia (validar con contador; se editan en Nómina > Configuración).
-- 25/12/2025: nocturno desde las 19:00 (Ley 2466). 01/07/2026: festivo 90 %. 15/07/2026: 42 h (Ley 2101).
insert into public.vigencias_recargos
  (vigente_desde, inicio_nocturno, fin_nocturno, pct_nocturno, pct_festivo, pct_extra_diurna,
   pct_extra_nocturna, horas_semanales, jornada_diaria_horas, inicio_semana)
values
  ('2025-12-25', '19:00', '06:00', 35, 80, 25, 75, 44, 8, 1),
  ('2026-07-01', '19:00', '06:00', 35, 90, 25, 75, 44, 8, 1),
  ('2026-07-15', '19:00', '06:00', 35, 90, 25, 75, 42, 8, 1);

-- Primer administrador: crea tu usuario (Authentication > Users > Add user > Create new user,
-- marcando Auto Confirm User) y luego
-- ejecuta esta línea con tu correo:
-- update public.perfiles set rol = 'admin' where correo = 'tu-correo@ejemplo.com';
