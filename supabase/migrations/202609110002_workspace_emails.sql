begin;
create table public.workspace_emails (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.workspace_clients(id),
  recipient text not null,
  kind text not null check (kind in ('invitation','stage')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','cancelled')),
  attempts integer not null default 0,
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
alter table public.workspace_emails enable row level security;
revoke all on public.workspace_emails from anon, authenticated;
grant select on public.workspace_emails to authenticated;
create policy "Admin reads email queue" on public.workspace_emails for select to authenticated using (public.is_portfolio_admin());
create index workspace_email_queue on public.workspace_emails(status,created_at);

create function public.workspace_queue_email() returns trigger language plpgsql security definer set search_path = '' as $$
declare customer public.workspace_clients;
begin
  if tg_table_name = 'workspace_clients' then
    insert into public.workspace_emails(client_id,recipient,kind,payload)
    values(new.id,new.email,'invitation',jsonb_build_object('name',new.name));
  elsif tg_op = 'INSERT' or new.stage is distinct from old.stage then
    select * into customer from public.workspace_clients where id=new.client_id;
    insert into public.workspace_emails(client_id,recipient,kind,payload)
    values(customer.id,customer.email,'stage',jsonb_build_object('name',customer.name,'title',new.title,'stage',new.stage,'next_step',new.next_step,'due_date',new.due_date));
  end if;
  return new;
end;
$$;
revoke all on function public.workspace_queue_email() from public;
create trigger workspace_client_invitation after insert on public.workspace_clients for each row execute function public.workspace_queue_email();
create trigger workspace_stage_email after insert or update on public.workspace_projects for each row execute function public.workspace_queue_email();

create function public.workspace_claim_emails() returns setof public.workspace_emails
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_portfolio_admin() then raise insufficient_privilege; end if;
  update public.workspace_emails e set status='cancelled' where e.status in ('pending','failed') and not exists(select 1 from public.workspace_clients c where c.id=e.client_id and c.email=e.recipient);
  return query update public.workspace_emails e set status='sending',locked_at=now(),attempts=e.attempts+1
  where e.id in (select q.id from public.workspace_emails q join public.workspace_clients c on c.id=q.client_id and c.email=q.recipient
    where q.attempts<3 and (q.status in ('pending','failed') or (q.status='sending' and q.locked_at<now()-interval '5 minutes'))
    order by q.created_at limit 5 for update of q skip locked) returning e.*;
end;
$$;
create function public.workspace_finish_email(target uuid, attempt integer, succeeded boolean, failure text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_portfolio_admin() then raise insufficient_privilege; end if;
  update public.workspace_emails set status=case when succeeded then 'sent' else 'failed' end,
    sent_at=case when succeeded then now() else null end,last_error=left(failure,300)
    where id=target and status='sending' and attempts=attempt;
end;
$$;
revoke all on function public.workspace_claim_emails() from public;
revoke all on function public.workspace_finish_email(uuid,integer,boolean,text) from public;
grant execute on function public.workspace_claim_emails() to authenticated;
grant execute on function public.workspace_finish_email(uuid,integer,boolean,text) to authenticated;
commit;
