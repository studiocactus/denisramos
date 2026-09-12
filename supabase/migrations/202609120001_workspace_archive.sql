begin;
-- Archiving keeps the project and its history available to both parties.
alter table public.workspace_projects add column archived_at timestamptz;
create index workspace_projects_active_updated on public.workspace_projects(updated_at desc) where deleted_at is null;
commit;
