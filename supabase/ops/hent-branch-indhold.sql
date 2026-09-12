-- 0.1: kontorets arbejde paa branchen laeses ud, foer wipen.
--
-- Svaret er ÉT json-dokument. Ikke kolonner adskilt af tab: saetningerne er fri
-- tekst med komma, apostrof og linjeskift i, og et skilletegn ville knaekke dem.
-- json_agg pakker det ind, og node pakker det ud igen og skriver SQL'en.
select json_build_object(
  'materials', (
    select coalesce(json_agg(m order by m.sort_order, m.name), '[]'::json)
    from (
      select name, sort_order, active, report_name,
             sentence_genbrug, sentence_genanvendelse, sentence_bortskaffelse,
             sentence_forurenet, sentence_asbest, sentence_farligt
      from screening.materials
    ) m
  ),
  'building_parts', (
    select coalesce(json_agg(b order by b.sort_order, b.name), '[]'::json)
    from (select name, sort_order, active from screening.building_parts) b
  ),
  'app_settings', (
    select coalesce(json_agg(a order by a.key), '[]'::json)
    from (select key, value from screening.app_settings) a
  ),
  'sample_types', (
    select coalesce(json_agg(s order by s.sort_order, s.name), '[]'::json)
    from (select name, sort_order, active from screening.sample_types) s
  )
)::text;
