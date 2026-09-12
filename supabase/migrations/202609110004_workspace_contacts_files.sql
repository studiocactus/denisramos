begin;
alter table public.workspace_clients
  add column phone text not null default '' check(length(phone)<=40),
  add column project_contact text not null default '' check(length(project_contact)<=120),
  add column additional_email text not null default '' check(length(additional_email)<=254 and (additional_email='' or additional_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  add column address text not null default '' check(length(address)<=500),
  add column whatsapp text not null default '' check(length(whatsapp)<=40);
create policy "Client updates own contact" on public.workspace_clients for update to authenticated using(public.workspace_owns_client(id)) with check(public.workspace_owns_client(id));
create function public.workspace_protect_identity() returns trigger language plpgsql set search_path='' as $$
begin
  if not public.is_portfolio_admin() and (new.id is distinct from old.id or new.email is distinct from old.email) then raise exception 'Access identity cannot be changed'; end if;
  return new;
end; $$;
create trigger workspace_protect_identity before update on public.workspace_clients for each row execute function public.workspace_protect_identity();
alter table public.workspace_updates add column reply_to uuid references public.workspace_updates(id) on delete set null;
grant insert(reply_to), update(body), delete on public.workspace_updates to authenticated;
create policy "Admin edits messages" on public.workspace_updates for update to authenticated using(public.is_portfolio_admin()) with check(public.is_portfolio_admin());
create policy "Admin deletes messages" on public.workspace_updates for delete to authenticated using(public.is_portfolio_admin());
create function public.workspace_check_reply() returns trigger language plpgsql set search_path='' as $$
begin
  if new.reply_to is not null and not exists(select 1 from public.workspace_updates where id=new.reply_to and project_id=new.project_id) then raise exception 'Reply must belong to the same project'; end if;
  return new;
end; $$;
create trigger workspace_check_reply before insert on public.workspace_updates for each row execute function public.workspace_check_reply();
insert into storage.buckets(id,name,public,file_size_limit) values('workspace-files','workspace-files',false,4194304) on conflict(id) do update set public=false,file_size_limit=4194304;
create policy "Read project files" on storage.objects for select to authenticated using(bucket_id='workspace-files' and exists(select 1 from public.workspace_projects p where p.id::text=split_part(name,'/',1)));
create policy "Upload project files" on storage.objects for insert to authenticated with check(bucket_id='workspace-files' and exists(select 1 from public.workspace_projects p where p.id::text=split_part(name,'/',1)));
commit;
