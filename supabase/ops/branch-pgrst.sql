-- 0.5, faelde nr. 1 fra supabase/LAESMIG.md: API'et udstiller ikke `screening`.
--
-- En branch oprettet uden GitHub-integrationen faar ikke config.toml anvendt.
-- Uden dette svarer hver eneste forespoergsel `PGRST106 Invalid schema:
-- screening`, og appen ser ud som om databasen var tom.
--
-- Idempotent, og koeres ogsaa naar indstillingen ser rigtig ud: `reset_branch`
-- har lige lavet DDL, og PostgREST skal genindlaese skemaet bagefter.
--
-- BEGGE notify er noedvendige. Uden den sidste kender PostgREST skemaet, men
-- ikke dens tabeller, og svarer `PGRST205 Could not find the table` i stedet.
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, screening';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';

-- Bevis: forventet én raekke med 'screening' i.
select s as indstilling
from pg_db_role_setting r
join pg_roles ro on ro.oid = r.setrole, unnest(r.setconfig) s
where ro.rolname = 'authenticator' and s like 'pgrst.db_schemas%';
