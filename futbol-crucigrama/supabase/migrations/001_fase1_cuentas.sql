-- Fase 1: cuentas y resultados en la nube.

-- Perfil público de cada jugador (nombre y foto de Google).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Jugador',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Copia en la nube de todo lo que la app guarda en el dispositivo (progreso del
-- día y estadísticas), para seguir en otro celular o en la compu.
create table if not exists public.user_kv (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Un resultado por jugador, juego, variante y día. Lo usan las tablas de posiciones.
-- score: crucigrama = segundos con penalizaciones (menos es mejor);
-- adivina / carta = intentos (menos es mejor, 7 = no acertó);
-- rebuscado / ranking = puntos (más es mejor).
create table if not exists public.results (
  user_id uuid not null references auth.users (id) on delete cascade,
  game text not null check (game in ('crucigrama', 'adivina', 'carta', 'rebuscado', 'ranking')),
  variant text not null default '',
  day date not null,
  score numeric not null,
  details jsonb not null default '{}'::jsonb,
  finished_at timestamptz not null default now(),
  primary key (user_id, game, variant, day)
);
create index if not exists results_day_idx on public.results (game, variant, day);

alter table public.profiles enable row level security;
alter table public.user_kv enable row level security;
alter table public.results enable row level security;

-- Perfiles: los ve cualquiera con sesión (para las tablas de grupos); cada uno edita el suyo.
drop policy if exists "perfiles visibles" on public.profiles;
create policy "perfiles visibles" on public.profiles for select to authenticated using (true);
drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Datos y resultados: cada uno solo los suyos (en la fase 2 se suman los de su grupo).
drop policy if exists "mis datos" on public.user_kv;
create policy "mis datos" on public.user_kv for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "mis resultados" on public.results;
create policy "mis resultados" on public.results for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Al registrarse, se crea el perfil con el nombre y la foto de Google.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'Jugador'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
