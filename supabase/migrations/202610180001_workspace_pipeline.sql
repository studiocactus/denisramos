begin;
-- Commercial pipeline: prospects become opportunities with an explicit stage,
-- next action and values. Only admins read or write this table.
create table public.workspace_opportunities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  company text not null default '' check (length(company) <= 160),
  email text not null default '' check (email = '' or (email = lower(trim(email)) and length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  phone text not null default '' check (length(phone) <= 40),
  source text not null default '' check (length(source) <= 120),
  service_interest text not null default '' check (length(service_interest) <= 160),
  need text not null default '' check (length(need) <= 3000),
  stage text not null default 'novo_contato' check (stage in ('novo_contato','qualificacao','contato_realizado','reuniao','proposta_enviada','negociacao','ganho','perdido')),
  estimated_value numeric(12,2) check (estimated_value is null or estimated_value >= 0),
  proposal_value numeric(12,2) check (proposal_value is null or proposal_value >= 0),
  lost_reason text not null default '' check (length(lost_reason) <= 500),
  notes text not null default '' check (length(notes) <= 3000),
  next_action text not null default '' check (length(next_action) <= 300),
  next_action_date date,
  client_id uuid references public.workspace_clients(id),
  project_id uuid references public.workspace_projects(id),
  converted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workspace_opportunities_stage on public.workspace_opportunities(stage, updated_at desc) where deleted_at is null;
alter table public.workspace_opportunities enable row level security;
revoke all on public.workspace_opportunities from anon, authenticated;
grant select, insert, update, delete on public.workspace_opportunities to authenticated;
create policy "Admin manages opportunities" on public.workspace_opportunities for all to authenticated
  using (deleted_at is null and public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create trigger workspace_opportunities_updated before update on public.workspace_opportunities
  for each row execute function public.portfolio_touch_updated_at();

-- Conversion is atomic: it reuses an existing client when the e-mail already
-- exists, creates the client and the project, and links them to the history.
create function public.workspace_convert_opportunity(target uuid, project_title text, start date default null, due date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare opp public.workspace_opportunities; v_client uuid; v_project uuid;
begin
  if not public.is_portfolio_admin() then raise insufficient_privilege; end if;
  if project_title is null or length(trim(project_title)) not between 1 and 160 then raise exception 'Invalid project title'; end if;
  if start is not null and due is not null and due < start then raise exception 'Invalid dates'; end if;
  select * into opp from public.workspace_opportunities where id = target and deleted_at is null for update;
  if not found then raise exception 'Opportunity not found'; end if;
  if opp.stage = 'perdido' then raise exception 'Lost opportunity'; end if;
  if opp.converted_at is not null then raise exception 'Already converted'; end if;
  if opp.email = '' then raise exception 'Opportunity needs an e-mail before conversion'; end if;
  select id into v_client from public.workspace_clients where email = opp.email;
  if v_client is null then
    insert into public.workspace_clients(name, email, company, phone)
    values (opp.name, opp.email, opp.company, opp.phone) returning id into v_client;
  end if;
  insert into public.workspace_projects(client_id, title, description, start_date, due_date)
  values (v_client, trim(project_title), left(opp.need, 3000), start, due) returning id into v_project;
  update public.workspace_opportunities
    set stage = 'ganho', client_id = v_client, project_id = v_project, converted_at = now(), lost_reason = ''
    where id = target;
  return v_project;
end;
$$;
revoke all on function public.workspace_convert_opportunity(uuid,text,date,date) from public;
grant execute on function public.workspace_convert_opportunity(uuid,text,date,date) to authenticated;
commit;
