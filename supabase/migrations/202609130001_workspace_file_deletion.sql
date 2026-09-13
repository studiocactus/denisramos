begin;
create policy "Delete accessible project files" on storage.objects
for delete to authenticated
using (
  bucket_id = 'workspace-files'
  and exists (
    select 1 from public.workspace_projects p
    where p.id::text = split_part(name, '/', 1)
      and p.deleted_at is null
  )
);
commit;
