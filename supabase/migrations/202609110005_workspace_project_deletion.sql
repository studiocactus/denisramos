begin;
alter table public.workspace_projects add column deleted_at timestamptz;
alter policy "Read own projects" on public.workspace_projects using
  (deleted_at is null and (public.is_portfolio_admin() or public.workspace_owns_client(client_id)));
alter policy "Admin updates projects" on public.workspace_projects using
  (deleted_at is null and public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create function public.workspace_delete_project(target uuid, expected_version timestamptz) returns boolean
language plpgsql security definer set search_path='' as $$
declare changed uuid;
begin
  if not public.is_portfolio_admin() then raise insufficient_privilege; end if;
  update public.workspace_projects set deleted_at=now()
    where id=target and deleted_at is null and updated_at=expected_version returning id into changed;
  return changed is not null;
end;
$$;
revoke all on function public.workspace_delete_project(uuid,timestamptz) from public;
grant execute on function public.workspace_delete_project(uuid,timestamptz) to authenticated;
commit;
