-- Egen privat bucket, adskilt fra websitets customer-files.
-- Sti: {case_id}/{sample_id}/{uuid}.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screening-photos', 'screening-photos', false, 10485760,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy screening_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'screening-photos' and screening.is_member());
create policy screening_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'screening-photos' and screening.is_member());
create policy screening_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'screening-photos' and screening.is_member())
  with check (bucket_id = 'screening-photos' and screening.is_member());
create policy screening_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'screening-photos' and screening.is_member());