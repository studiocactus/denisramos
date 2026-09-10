-- Execute no SQL Editor do projeto Supabase. Não contém dados de clientes ou senhas.
-- Migração inicial: conteúdo público separado de rascunhos e lista de administradores privada.
begin;

create table public.portfolio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.portfolio_admins enable row level security;
revoke all on public.portfolio_admins from anon, authenticated;

create function public.is_portfolio_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.portfolio_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_portfolio_admin() from public;
grant execute on function public.is_portfolio_admin() to anon, authenticated;

create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  content jsonb not null check (jsonb_typeof(content) = 'object' and not (content ? 'projects')),
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
create policy "Public site settings" on public.site_settings for select to anon, authenticated using (true);
create policy "Admins manage site settings" on public.site_settings for all to authenticated
  using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

create table public.portfolio_projects (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  published boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.portfolio_projects enable row level security;
revoke all on public.portfolio_projects from anon, authenticated;
grant select on public.portfolio_projects to anon, authenticated;
grant insert, update, delete on public.portfolio_projects to authenticated;
create policy "Published projects only" on public.portfolio_projects for select to anon, authenticated
  using (published or public.is_portfolio_admin());
create policy "Admins manage projects" on public.portfolio_projects for all to authenticated
  using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

create function public.portfolio_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger site_settings_updated before update on public.site_settings
for each row execute function public.portfolio_touch_updated_at();
create trigger portfolio_projects_updated before update on public.portfolio_projects
for each row execute function public.portfolio_touch_updated_at();

commit;
