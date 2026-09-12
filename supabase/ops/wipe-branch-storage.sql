-- Toemmer branchens to screening-buckets. Bruges i 0.2 og igen i 4.0.
--
-- KUN PAA BRANCHEN. Gor det aldrig i produktionen: der skal filerne fjernes
-- gennem Storage-API'et, foer raekkerne slettes, saa der ikke bliver
-- forældreloese blobs — se «Sletning» i AGENTS.md.
--
-- Her er forældreloese blobs det bevidste valg (12.6): branchen er et
-- testprojekt, en fil uden objektraekke kan ikke naas gennem API'et, og
-- alternativet var at bede mennesket om en storage-noegle.
--
-- ---------------------------------------------------------------------------
-- Hvorfor `storage.allow_delete_query`
-- ---------------------------------------------------------------------------
-- Planens 0.2 var et bart `delete from storage.objects`. Det svarer Supabase nu:
--
--   ERROR:  Direct deletion from storage tables is not allowed. Use the Storage
--           API instead.
--   HINT:   This prevents accidental data loss from orphaned objects.
--   CONTEXT: PL/pgSQL function storage.protect_delete() line 5 at RAISE
--
-- Triggeren `protect_objects_delete` (BEFORE DELETE ... FOR EACH STATEMENT) er
-- kommet til siden planen blev skrevet. Den har Supabases egen doer indbygget,
-- og den er laest ud af funktionens krop — ikke gaettet:
--
--   IF COALESCE(current_setting('storage.allow_delete_query', true), 'false')
--        != 'true' THEN RAISE EXCEPTION ...
--
-- `set local` og ikke `set`: flaget gaelder kun denne transaktion og er vaek
-- igen bagefter. Beskyttelsen staar altsaa uroert for alt andet — ogsaa for det
-- naeste, nogen koerer i den samme session.
--
-- Bemaerk: websitets buckets `blog-images` og `customer-files` ligger i samme
-- projekt. Derfor er `where bucket_id in (...)` ikke pynt.
begin;
set local storage.allow_delete_query = 'true';

delete from storage.objects
where bucket_id in ('screening-photos', 'screening-rapport');

commit;

-- Bevis: forventet INGEN raekker.
select bucket_id, count(*) as objekter
from storage.objects
where bucket_id in ('screening-photos', 'screening-rapport')
group by 1 order by 1;

-- Og at der ikke blev roert noget, der ikke skulle roeres.
select b.id as bucket, count(o.id) as objekter
from storage.buckets b left join storage.objects o on o.bucket_id = b.id
group by b.id order by b.id;
