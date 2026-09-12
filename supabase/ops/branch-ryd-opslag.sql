-- 2.3, foerste halvdel: branchens egne opslagsraekker ryddes, saa produktionens
-- kan lande uaendret.
--
-- KUN PAA BRANCHEN. Se noten ved 2.3 i FASE-2-TIL-MAIN.md.
--
-- Hvorfor det er noedvendigt: `screening_seed_lookups` indsaetter de 55
-- materialer og 21 proevearter UDEN id, saa `gen_random_uuid()` giver dem
-- forskellige id'er i hvert miljoe — men de samme navne. Branchen staar efter
-- Fase 0 med sine egne seedede raekker, og `pg_dump --data-only` tager
-- produktionens med. De rammer `materials_name_key`, `sample_types_name_key` og
-- `app_settings_pkey`.
--
-- Det er ikke tegnet paa et inkonsistent dump, som 2.3 ellers tolker en fejl
-- som. Det er to miljoeer, der har seedet den samme liste hver for sig.
--
-- Hvorfor det er frit: INGEN fremmednoegle peger paa nogen af de tre. Efterproevet
-- mod skema-basis.txt, ikke antaget. `samples.material` og `samples.sample_type`
-- er ren TEKST, ikke opslag, saa proeverne mister ingenting. `building_parts`
-- findes ikke paa dette tidspunkt.
--
-- Og hvorfor det er det RIGTIGE: generalproeven skal koere paa produktionens
-- raekker. Spaerren i `saetninger_fra_skabelonen` slaar op paa navn, og
-- `app_settings` skal have produktionens ene `eurofins_analyses_details`, for at
-- «+1 raekke» i 2.6 betyder det samme som i 4.5.
begin;

-- Spaerre: filen toemmer tabeller og maa aldrig naa produktionen. Produktionen
-- har sager; branchen har ingen paa dette tidspunkt.
do $$
begin
  if exists (select 1 from screening.cases) then
    raise exception 'branch-ryd-opslag.sql afbrudt: screening.cases er ikke tom'
      using hint = 'Filen hoerer i et TOMT testmiljoe foer 2.3. Er der sager, er det efter alt at doemme produktionen.';
  end if;
end $$;

delete from screening.app_settings;
delete from screening.materials;
delete from screening.sample_types;

commit;

-- Bevis: alle tre paa nul.
select 'app_settings' as tabel, count(*) as n from screening.app_settings
union all select 'materials', count(*) from screening.materials
union all select 'sample_types', count(*) from screening.sample_types
order by 1;
