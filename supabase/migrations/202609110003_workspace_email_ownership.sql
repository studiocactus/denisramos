begin;
alter table public.workspace_emails add column project_id uuid references public.workspace_projects(id);
create or replace function public.workspace_queue_email() returns trigger language plpgsql security definer set search_path = '' as $$
declare customer public.workspace_clients;
begin
  if tg_table_name = 'workspace_clients' then
    insert into public.workspace_emails(client_id,recipient,kind,payload)
    values(new.id,new.email,'invitation',jsonb_build_object('name',new.name));
  elsif tg_op = 'INSERT' or new.stage is distinct from old.stage then
    select * into customer from public.workspace_clients where id=new.client_id;
    insert into public.workspace_emails(client_id,project_id,recipient,kind,payload)
    values(customer.id,new.id,customer.email,'stage',jsonb_build_object('name',customer.name,'title',new.title,'stage',new.stage,'next_step',new.next_step,'due_date',new.due_date));
  end if;
  return new;
end;
$$;

create or replace function public.workspace_claim_emails() returns setof public.workspace_emails
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_portfolio_admin() then raise insufficient_privilege; end if;
  update public.workspace_emails e set status='cancelled' where e.status in ('pending','failed') and (not exists(select 1 from public.workspace_clients c where c.id=e.client_id and c.email=e.recipient) or (e.kind='stage' and not exists(select 1 from public.workspace_projects p where p.id=e.project_id and p.client_id=e.client_id)));
  return query update public.workspace_emails e set status='sending',locked_at=now(),attempts=e.attempts+1
  where e.id in (select q.id from public.workspace_emails q join public.workspace_clients c on c.id=q.client_id and c.email=q.recipient
    where (q.kind='invitation' or exists(select 1 from public.workspace_projects p where p.id=q.project_id and p.client_id=q.client_id)) and q.attempts<3 and (q.status in ('pending','failed') or (q.status='sending' and q.locked_at<now()-interval '5 minutes'))
    order by q.created_at limit 5 for update of q skip locked) returning e.*;
end;
$$;

commit;
