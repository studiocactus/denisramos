begin;

create table public.workspace_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  email text not null unique check (email = lower(trim(email)) and length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  company text not null default '' check (length(company) <= 160),
  updated_at timestamptz not null default now()
);
create table public.workspace_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.workspace_clients(id),
  title text not null check (length(trim(title)) between 1 and 160),
  description text not null default '' check (length(description) <= 3000),
  stage integer not null default 0 check (stage between 0 and 4),
  start_date date,
  due_date date,
  delivery_url text not null default '' check (length(delivery_url) <= 2000 and (delivery_url = '' or delivery_url ~ '^https?://[^[:space:]]+$')),
  next_step text not null default '' check (length(next_step) <= 1000),
  updated_at timestamptz not null default now(),
  check (start_date is null or due_date is null or due_date >= start_date)
);
create table public.workspace_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.workspace_projects(id),
  body text not null check (length(trim(body)) between 1 and 3000),
  author_id uuid not null default auth.uid() references auth.users(id),
  author_role text not null check (author_role in ('admin','client')),
  created_at timestamptz not null default now()
);
create index workspace_projects_client on public.workspace_projects(client_id);
create index workspace_updates_project on public.workspace_updates(project_id, created_at);

-- Read the verified identity from Auth, never from client-supplied user metadata.
create function public.workspace_owns_client(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.workspace_clients c join auth.users u on lower(u.email) = c.email
    where c.id = target and u.id = (select auth.uid()) and u.email_confirmed_at is not null);
$$;
revoke all on function public.workspace_owns_client(uuid) from public;
grant execute on function public.workspace_owns_client(uuid) to authenticated;

alter table public.workspace_clients enable row level security;
alter table public.workspace_projects enable row level security;
alter table public.workspace_updates enable row level security;
revoke all on public.workspace_clients, public.workspace_projects, public.workspace_updates from anon, authenticated;
grant select, insert, update on public.workspace_clients, public.workspace_projects to authenticated;
grant select on public.workspace_updates to authenticated;
grant insert (project_id, body, author_id, author_role) on public.workspace_updates to authenticated;

create policy "Read own client" on public.workspace_clients for select to authenticated
  using (public.is_portfolio_admin() or public.workspace_owns_client(id));
create policy "Admin inserts clients" on public.workspace_clients for insert to authenticated with check (public.is_portfolio_admin());
create policy "Admin updates clients" on public.workspace_clients for update to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy "Read own projects" on public.workspace_projects for select to authenticated
  using (public.is_portfolio_admin() or public.workspace_owns_client(client_id));
create policy "Admin inserts projects" on public.workspace_projects for insert to authenticated with check (public.is_portfolio_admin());
create policy "Admin updates projects" on public.workspace_projects for update to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy "Read own updates" on public.workspace_updates for select to authenticated
  using (exists (select 1 from public.workspace_projects p where p.id = project_id));
create policy "Post own updates" on public.workspace_updates for insert to authenticated
  with check (author_id = (select auth.uid()) and (
    (public.is_portfolio_admin() and author_role = 'admin') or
    (author_role = 'client' and exists (select 1 from public.workspace_projects p where p.id = project_id and public.workspace_owns_client(p.client_id)))
  ));
create trigger workspace_clients_updated before update on public.workspace_clients for each row execute function public.portfolio_touch_updated_at();
create trigger workspace_projects_updated before update on public.workspace_projects for each row execute function public.portfolio_touch_updated_at();

create function public.workspace_log_stage() returns trigger
language plpgsql security definer set search_path = '' as $$
declare labels text[] := array['Briefing','Design','Desenvolvimento','Em revisão','Concluído'];
begin
  if auth.uid() is not null and (tg_op = 'INSERT' or new.stage is distinct from old.stage) then
    insert into public.workspace_updates(project_id, body, author_id, author_role)
    values (new.id, case when tg_op = 'INSERT' then 'Projeto iniciado na etapa: ' else 'Etapa atualizada para: ' end || labels[new.stage + 1] || '.', auth.uid(), 'admin');
  end if;
  return new;
end;
$$;
revoke all on function public.workspace_log_stage() from public;
create trigger workspace_project_history after insert or update on public.workspace_projects for each row execute function public.workspace_log_stage();

commit;
