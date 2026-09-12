-- Skemalisten fra FASE-2-TIL-MAIN.md, afsnit 12.1. Bruges ordret alle steder.
with dele as (
  select 'kolonne ' || table_name || '.' || column_name || ' ' || data_type
       || case when udt_schema = 'screening' then ' (' || udt_name || ')' else '' end
       || case when is_nullable = 'NO' then ' not null' else '' end
       || coalesce(' default ' || column_default, '') as linje
  from information_schema.columns where table_schema = 'screening'
  union all
  select 'constraint ' || c.relname || '.' || k.conname || ' ' || pg_get_constraintdef(k.oid)
  from pg_constraint k join pg_class c on c.oid = k.conrelid
  where k.connamespace = 'screening'::regnamespace
  union all
  select 'indeks ' || indexdef from pg_indexes where schemaname = 'screening'
  union all
  select 'politik ' || tablename || '.' || policyname || ' ' || cmd
       || ' roles=' || array_to_string(roles, ',')
       || ' using=' || coalesce(qual, '') || ' check=' || coalesce(with_check, '')
  from pg_policies where schemaname = 'screening'
  union all
  select 'rls ' || c.relname || ' enabled=' || c.relrowsecurity::text || ' forced=' || c.relforcerowsecurity::text
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'screening' and c.relkind = 'r'
  union all
  select 'funktion ' || p.proname || ' ' || md5(pg_get_functiondef(p.oid))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'screening'
  union all
  select 'trigger ' || pg_get_triggerdef(t.oid)
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'screening' and not t.tgisinternal
  union all
  select 'enum ' || t.typname || ' ' || string_agg(e.enumlabel, ',' order by e.enumsortorder)
  from pg_type t join pg_namespace n on n.oid = t.typnamespace join pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'screening' group by t.typname
  union all
  select 'grant ' || table_name || ' ' || grantee || ' ' || string_agg(privilege_type, ',' order by privilege_type)
  from information_schema.role_table_grants
  where table_schema = 'screening' and grantee in ('authenticated', 'service_role', 'anon')
  group by table_name, grantee
)
select md5(string_agg(linje, chr(10) order by linje)) as md5,
       string_agg(linje, chr(10) order by linje) as liste
from dele;
