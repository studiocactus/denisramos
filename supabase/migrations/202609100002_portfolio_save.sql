-- Execute uma vez no SQL Editor. Libera a conta indicada e cria o salvamento atômico.
begin;

insert into public.portfolio_admins (user_id)
values ('64827922-a37a-4638-b21d-ca0f120f12de')
on conflict (user_id) do nothing;

create function public.save_portfolio(payload jsonb, expected_version timestamptz)
returns timestamptz
language plpgsql security invoker set search_path = '' as $$
declare current_version timestamptz; next_version timestamptz;
begin
  if not public.is_portfolio_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  -- Serialize writes, including the first publication when site_settings is empty.
  perform pg_catalog.pg_advisory_xact_lock(64827922);
  select updated_at into current_version from public.site_settings where id = 1;
  if current_version is distinct from expected_version then
    raise exception 'Content changed; reload before saving' using errcode = '40001';
  end if;
  if pg_catalog.jsonb_typeof(payload) is distinct from 'object'
     or pg_catalog.jsonb_typeof(payload->'projects') is distinct from 'array' then
    raise exception 'Invalid portfolio' using errcode = '22023';
  end if;
  insert into public.site_settings (id, content) values (1, payload - 'projects')
    on conflict (id) do update set content = excluded.content
    returning updated_at into next_version;
  delete from public.portfolio_projects;
  insert into public.portfolio_projects (slug, content, published, sort_order)
    select item->>'slug', item - 'slug' - 'published', (item->>'published')::boolean, position::integer - 1
    from pg_catalog.jsonb_array_elements(payload->'projects') with ordinality as projects(item, position);
  return next_version;
end;
$$;
revoke all on function public.save_portfolio(jsonb, timestamptz) from public, anon;
grant execute on function public.save_portfolio(jsonb, timestamptz) to authenticated;
commit;
