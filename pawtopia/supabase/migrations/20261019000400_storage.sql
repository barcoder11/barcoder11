-- Media bucket for official character art, animation frames, posters and teasers.
-- * Public read via CDN URLs (paths include a random id, so unpublished
--   uploads are unlisted but not secret; keep embargoed source files elsewhere).
-- * Only admins/editors can upload, replace, list or delete.
-- * Type and size are enforced by the bucket itself; SVG is rejected because it
--   can carry scripts.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pawtopia-media', 'pawtopia-media', true, 52428800,
  array['image/png', 'image/webp', 'image/jpeg', 'image/gif', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "pawtopia media editor read" on storage.objects;
drop policy if exists "pawtopia media editor insert" on storage.objects;
drop policy if exists "pawtopia media editor update" on storage.objects;
drop policy if exists "pawtopia media editor delete" on storage.objects;

create policy "pawtopia media editor read" on storage.objects
  for select to authenticated
  using (bucket_id = 'pawtopia-media' and public.is_content_editor());

create policy "pawtopia media editor insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pawtopia-media'
    and public.is_content_editor()
    and (storage.foldername(name))[1] = 'animals'
  );

create policy "pawtopia media editor update" on storage.objects
  for update to authenticated
  using (bucket_id = 'pawtopia-media' and public.is_content_editor())
  with check (bucket_id = 'pawtopia-media' and public.is_content_editor());

create policy "pawtopia media editor delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pawtopia-media' and public.is_content_editor());
