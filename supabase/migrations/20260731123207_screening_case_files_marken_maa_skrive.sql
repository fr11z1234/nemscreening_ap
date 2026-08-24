-- Forsidebilledet tages i marken, af screeneren, samtidig med at sagen
-- oprettes. Med is_office pa hele tabellen kunne hun ikke gemme det.
--
-- Delingen folger hvem der ejer materialet: et foto og en plantegning er
-- markarbejde som sample_photos, mens Eurofins' analyserapport hoerer til
-- laboratoriesvaret og dermed til kontoret - samme graense som lab_results.

drop policy case_files_write on screening.case_files;

create policy case_files_write on screening.case_files
  for all
  using (
    case
      when kind in ('eurofins_pdf', 'eurofins_side') then screening.is_office()
      else screening.is_member()
    end
  )
  with check (
    case
      when kind in ('eurofins_pdf', 'eurofins_side') then screening.is_office()
      else screening.is_member()
    end
  );

-- Storage folger med: bucket-policyen var ogsa is_office pa alt.
drop policy screening_rapport_insert on storage.objects;
drop policy screening_rapport_update on storage.objects;
drop policy screening_rapport_delete on storage.objects;

create policy screening_rapport_insert on storage.objects
  for insert with check (bucket_id = 'screening-rapport' and screening.is_member());

create policy screening_rapport_update on storage.objects
  for update using (bucket_id = 'screening-rapport' and screening.is_member())
  with check (bucket_id = 'screening-rapport' and screening.is_member());

create policy screening_rapport_delete on storage.objects
  for delete using (bucket_id = 'screening-rapport' and screening.is_member());