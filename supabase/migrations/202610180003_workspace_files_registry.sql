begin;
-- A registry beside Storage gives every file a visible name, type, size, author
-- and date, and lets an attachment belong to the project, the conversation or
-- one deliverable version. Storage paths stay server-generated.
create table public.workspace_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.workspace_projects(id) on delete cascade,
  deliverable_id uuid references public.workspace_deliverables(id) on delete set null,
  path text not null unique check (path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}-[A-Za-z0-9._-]{1,160}$'),
  name text not null check (length(trim(name)) between 1 and 160),
  extension text not null default '' check (length(extension) <= 10),
  size bigint not null check (size between 1 and 4194304),
  author_id uuid not null default auth.uid() references auth.users(id),
  author_role text not null check (author_role in ('admin','client')),
  created_at timestamptz not null default now()
);
create index workspace_files_project on public.workspace_files(project_id, created_at desc);
alter table public.workspace_files enable row level security;
revoke all on public.workspace_files from anon, authenticated;
grant select, insert, delete on public.workspace_files to authenticated;
create policy "Read project files" on public.workspace_files for select to authenticated
  using (public.is_portfolio_admin() or public.workspace_owns_client((select client_id from public.workspace_projects where id = project_id and deleted_at is null)));
create policy "Register own upload" on public.workspace_files for insert to authenticated
  with check (public.is_portfolio_admin() or (author_id = (select auth.uid()) and author_role = 'client'
    and public.workspace_owns_client((select client_id from public.workspace_projects where id = project_id and deleted_at is null))));
create policy "Admin deletes file records" on public.workspace_files for delete to authenticated using (public.is_portfolio_admin());
-- The uploader can remove their own attachment as well.
create policy "Delete own file records" on public.workspace_files for delete to authenticated using (author_id = (select auth.uid()));

-- Internal notes about a client never reach the client's own portal: the table
-- has no client-readable policy at all.
create table public.workspace_client_notes (
  client_id uuid primary key references public.workspace_clients(id) on delete cascade,
  body text not null default '' check (length(body) <= 5000),
  updated_at timestamptz not null default now()
);
alter table public.workspace_client_notes enable row level security;
revoke all on public.workspace_client_notes from anon, authenticated;
grant select, insert, update on public.workspace_client_notes to authenticated;
create policy "Admin reads client notes" on public.workspace_client_notes for select to authenticated using (public.is_portfolio_admin());
create policy "Admin writes client notes" on public.workspace_client_notes for insert to authenticated with check (public.is_portfolio_admin());
create policy "Admin updates client notes" on public.workspace_client_notes for update to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create trigger workspace_client_notes_updated before update on public.workspace_client_notes
  for each row execute function public.portfolio_touch_updated_at();

-- Approvals can notify the client through the same durable queue as invites
-- and stage changes. The queue table itself stays out of direct writes.
alter table public.workspace_emails drop constraint workspace_emails_kind_check;
alter table public.workspace_emails add constraint workspace_emails_kind_check check (kind in ('invitation','stage','approval'));
create function public.workspace_queue_approval_email(target uuid, title text, version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare customer public.workspace_clients;
begin
  if not public.is_portfolio_admin() then raise insufficient_privilege; end if;
  select c.* into customer from public.workspace_clients c
    join public.workspace_projects p on p.client_id = c.id
    where p.id = target and p.deleted_at is null;
  if not found then raise exception 'Project not found'; end if;
  insert into public.workspace_emails(client_id,recipient,kind,payload)
  values(customer.id,customer.email,'approval',jsonb_build_object('name',customer.name,'title',left(title,160),'version',version));
end;
$$;
revoke all on function public.workspace_queue_approval_email(uuid,text,integer) from public;
grant execute on function public.workspace_queue_approval_email(uuid,text,integer) to authenticated;
commit;
