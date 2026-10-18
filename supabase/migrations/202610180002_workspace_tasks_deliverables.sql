begin;
-- Tasks give the schedule explicit, checkable criteria. A delivery due date
-- passing never marks anything done by itself.
create table public.workspace_project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.workspace_projects(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  owner text not null default 'admin' check (owner in ('admin','client')),
  due_date date,
  done boolean not null default false,
  done_at timestamptz,
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index workspace_tasks_project on public.workspace_project_tasks(project_id, position, created_at);
alter table public.workspace_project_tasks enable row level security;
revoke all on public.workspace_project_tasks from anon, authenticated;
grant select, insert, update, delete on public.workspace_project_tasks to authenticated;
create policy "Read project tasks" on public.workspace_project_tasks for select to authenticated
  using (public.is_portfolio_admin() or public.workspace_owns_client((select client_id from public.workspace_projects where id = project_id and deleted_at is null)));
create policy "Admin manages tasks" on public.workspace_project_tasks for insert to authenticated with check (public.is_portfolio_admin());
create policy "Admin updates tasks" on public.workspace_project_tasks for update to authenticated
  using (public.is_portfolio_admin() or (owner = 'client' and public.workspace_owns_client((select client_id from public.workspace_projects where id = project_id and deleted_at is null))))
  with check (public.is_portfolio_admin() or (owner = 'client' and public.workspace_owns_client((select client_id from public.workspace_projects where id = project_id and deleted_at is null))));
create policy "Admin deletes tasks" on public.workspace_project_tasks for delete to authenticated using (public.is_portfolio_admin());
create trigger workspace_tasks_updated before update on public.workspace_project_tasks
  for each row execute function public.portfolio_touch_updated_at();

-- A client working on a task may only check it on or off.
create function public.workspace_task_client_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if not public.is_portfolio_admin() then
    if new.title is distinct from old.title or new.owner is distinct from old.owner
      or new.due_date is distinct from old.due_date or new.project_id is distinct from old.project_id
      or new.position is distinct from old.position then
      raise exception 'Only completion can be changed here';
    end if;
    new.done_at := case when new.done then now() else null end;
  elsif new.done and new.done_at is null then
    new.done_at := now();
  elsif not new.done then
    new.done_at := null;
  end if;
  return new;
end;
$$;
revoke all on function public.workspace_task_client_guard() from public;
create trigger workspace_task_guard before update on public.workspace_project_tasks
  for each row execute function public.workspace_task_client_guard();

-- Deliverables keep version history. Approval always points to one specific
-- version and records who approved and when.
create table public.workspace_deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.workspace_projects(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  description text not null default '' check (length(description) <= 3000),
  preview_url text not null default '' check (length(preview_url) <= 2000 and (preview_url = '' or preview_url ~ '^https?://[^[:space:]]+$')),
  version integer not null default 1 check (version between 1 and 999),
  supersedes uuid references public.workspace_deliverables(id) on delete set null,
  status text not null default 'in_review' check (status in ('in_review','approved','changes_requested')),
  approved_by text check (approved_by in ('admin','client')),
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index workspace_deliverables_project on public.workspace_deliverables(project_id, created_at desc);
alter table public.workspace_deliverables enable row level security;
revoke all on public.workspace_deliverables from anon, authenticated;
grant select, insert, update, delete on public.workspace_deliverables to authenticated;
create policy "Read project deliverables" on public.workspace_deliverables for select to authenticated
  using (public.is_portfolio_admin() or public.workspace_owns_client((select client_id from public.workspace_projects where id = project_id and deleted_at is null)));
create policy "Admin manages deliverables" on public.workspace_deliverables for insert to authenticated with check (public.is_portfolio_admin());
create policy "Admin updates deliverables" on public.workspace_deliverables for update to authenticated
  using (public.is_portfolio_admin() or public.workspace_owns_client((select client_id from public.workspace_projects where id = project_id and deleted_at is null)))
  with check (public.is_portfolio_admin() or public.workspace_owns_client((select client_id from public.workspace_projects where id = project_id and deleted_at is null)));
create policy "Admin deletes deliverables" on public.workspace_deliverables for delete to authenticated using (public.is_portfolio_admin());
create trigger workspace_deliverables_updated before update on public.workspace_deliverables
  for each row execute function public.portfolio_touch_updated_at();

-- The client may only accept or request changes, and only on the latest state
-- the server sees; the guard records the approval identity itself.
create function public.workspace_deliverable_client_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if not public.is_portfolio_admin() then
    if new.title is distinct from old.title or new.description is distinct from old.description
      or new.preview_url is distinct from old.preview_url or new.version is distinct from old.version
      or new.project_id is distinct from old.project_id or new.supersedes is distinct from old.supersedes
      or new.status not in ('approved','changes_requested') then
      raise exception 'Not allowed';
    end if;
    new.approved_by := case when new.status = 'approved' then 'client' else null end;
    new.approved_at := case when new.status = 'approved' then now() else null end;
  elsif new.status = 'approved' and old.status <> 'approved' and new.approved_by is null then
    new.approved_by := 'admin'; new.approved_at := now();
  elsif new.status <> 'approved' then
    new.approved_by := null; new.approved_at := null;
  end if;
  return new;
end;
$$;
revoke all on function public.workspace_deliverable_client_guard() from public;
create trigger workspace_deliverable_guard before update on public.workspace_deliverables
  for each row execute function public.workspace_deliverable_client_guard();

-- Comments can be pinned to one deliverable version; internal notes stay out
-- of the client's conversation through RLS below.
alter table public.workspace_updates
  add column deliverable_id uuid references public.workspace_deliverables(id) on delete set null,
  add column internal boolean not null default false;
grant insert(deliverable_id, internal), update(body) on public.workspace_updates to authenticated;
drop policy "Read own updates" on public.workspace_updates;
create policy "Read own updates" on public.workspace_updates for select to authenticated
  using ((internal = false or public.is_portfolio_admin())
    and exists (select 1 from public.workspace_projects p where p.id = project_id and p.deleted_at is null));
drop policy "Post own updates" on public.workspace_updates;
create policy "Post own updates" on public.workspace_updates for insert to authenticated
  with check (author_id = (select auth.uid()) and (internal = false or public.is_portfolio_admin()) and (
    (public.is_portfolio_admin() and author_role = 'admin') or
    (author_role = 'client' and exists (select 1 from public.workspace_projects p where p.id = project_id and p.deleted_at is null and public.workspace_owns_client(p.client_id)))
  ));

-- Per-reader read position drives unread counts without marking anything read
-- for the other party.
create table public.workspace_message_reads (
  project_id uuid not null references public.workspace_projects(id) on delete cascade,
  reader_id uuid not null references auth.users(id) on delete cascade,
  last_read timestamptz not null default now(),
  primary key (project_id, reader_id)
);
alter table public.workspace_message_reads enable row level security;
revoke all on public.workspace_message_reads from anon, authenticated;
grant select, insert, update on public.workspace_message_reads to authenticated;
create policy "Read own positions" on public.workspace_message_reads for select to authenticated using (reader_id = (select auth.uid()));
create policy "Write own position" on public.workspace_message_reads for insert to authenticated with check (reader_id = (select auth.uid()));
create policy "Update own position" on public.workspace_message_reads for update to authenticated using (reader_id = (select auth.uid())) with check (reader_id = (select auth.uid()));
commit;
