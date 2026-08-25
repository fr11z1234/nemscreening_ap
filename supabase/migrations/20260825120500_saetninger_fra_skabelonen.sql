-- Saetningerne fra kundens egen skabelon, lagt pa materialerne.
--
-- Ordene er IKKE vores. De star ordret som i det dokument Nemscreening sender
-- til kommuner. Standen er taget ud af dem, fordi den nu er et felt screeneren
-- udfylder — «i god stand» saettes ind af rapporten. Ret dem ikke for at gore
-- dem paenere.
--
-- HVILKEN handtering hver saetning hoerer til, er udledt her, og det er det
-- eneste gaet i filen. Reglen er mekanisk, sa den kan efterproves: saetningen
-- lander i den spalte, hvis ord staar FORST i den. «kan genbruges som hele sten
-- eller nedknuses» har genbrug forst; «kan knuses og genanvendes som
-- fyldmateriale» lander under genanvendelse.
--
-- Derfor staar `sentences_reviewed` som falsk pa alle raekker herunder. Panelet
-- viser det, indtil en fagperson har set efter, og det er praecis den fordeling,
-- de skal se efter.

-- ---------------------------------------------------------------------------
-- Materialer med ÉN entydig saetning i skabelonen
-- ---------------------------------------------------------------------------
update screening.materials m
set sentence_genbrug       = t.genbrug,
    sentence_genanvendelse = t.genanvendelse,
    sentences_reviewed     = false
from (values
  ('Beton (undtagen, gasbeton, letbeton)',
   null, 'egnet til nedknusning og genanvendelse i bygge- og anlægsprojekter.'),
  ('Puds',
   null, 'kan genanvendes som fyldmateriale.'),
  ('Eternit, asbestfri',
   null, 'kan knuses og genanvendes som fyldmateriale eller indgå i produktionen af nye byggematerialer.'),
  ('Gips',
   null, 'kan genanvendes, hvis korrekt frasorteret.'),
  ('Fugemasse',
   null, 'kan typisk genanvendes som mineralholdigt materiale efter behandling.'),
  ('Tapet',
   null, 'kan genanvendes og bruges til nye produkter, f.eks. papirprodukter.'),
  ('Isolering',
   null, 'kan genanvendes og bruges til fremstilling af ny isolering eller andre byggematerialer.'),
  ('Tæppe',
   'begrænset genbrugspotentiale, men kan i nogle tilfælde materialegenanvendes.', null),
  ('Glasseret tegl / Fliser / Klinker',
   'kan genbruges ved sortering og knusning til sekundære råmaterialer, f.eks. stabilgrus eller til vej- og anlægsprojekter.', null),
  ('Tagpap',
   'begrænset genbrugspotentiale, primært til energiudnyttelse.', null),
  ('Uglaseret tegl (mur- og tagsten)',
   'kan genbruges som hele sten eller nedknuses til sekundært råmateriale.', null),
  ('Vinduer',
   'med potentiale for genbrug, afhængigt af stand og eventuelle forurenende stoffer.', null)
) as t(navn, genbrug, genanvendelse)
where m.name = t.navn;

-- ---------------------------------------------------------------------------
-- Rapportnavn
-- ---------------------------------------------------------------------------
-- Kun ét. Parentesen pa betonen er en affaldsklassifikation og hoerer ikke i et
-- dokument til en kommune.
--
-- De ovrige lader vi staa tomme med vilje. Skabelonens linjenavne er bundet til
-- HVOR materialet sad — «Teglsten (tag)», «Fundamentsten», «Glas (uden for
-- vinduer)» — og rapportnavnet gaelder nu materialet uanset bygningsdel. Satte
-- vi «(tag)» pa uglaseret tegl, ville en facade fa det med. Kontoret saetter dem
-- selv i panelet, hvor de kan se hvad de gor.
update screening.materials set report_name = 'Beton'
where name = 'Beton (undtagen, gasbeton, letbeton)';

-- ---------------------------------------------------------------------------
-- De seks der IKKE kan seedes, og skabelonens ord til dem
-- ---------------------------------------------------------------------------
-- Skabelonen giver disse materialer FLERE forskellige saetninger, alt efter hvor
-- de sad. Med saetningen pa materialet er der kun plads til én pr. handtering,
-- og at vaelge for kontoret ville vaere at traeffe en faglig beslutning pa deres
-- vegne. De staar derfor tomme i panelet.
--
-- Kundens ord er skrevet ned her, sa de ikke skal findes frem igen. Er der brug
-- for flere af dem samtidig, er svaret at oprette materialet praecist — fx
-- «Trægulve» ved siden af «Træ» — for det er ogsa hvad de er.
--
--   Træ
--     bærende:    ubehandlet træ har et højt genbrugspotentiale, alternativt
--                 kan det energiudnyttes.
--     facade:     har genbrugspotentiale afhængigt af overfladebehandling.
--     vinduer/døre: velegnet til genbrug.
--     indvendige: vurderes egnede til genbrug eller energiudnyttelse.
--     tag:        kan genbruges eller energiudnyttes.
--
--   Jern og metal
--     bærende/øvrige: med højt genbrugspotentiale gennem omsmeltning og
--                 recirkulering.
--     tag:        har højt genbrugspotentiale gennem omsmeltning.
--
--   Letbeton
--     facade/vægge: kan knuses og genanvendes som fyldmateriale eller bruges i
--                 produktionen af nye byggematerialer.
--     øvrige:     kan nyttiggøres gennem genanvendelse.
--
--   Glas
--     vinduer/døre: kan genbruges eller anvendes i ny glasproduktion.
--     øvrige:     kan genbruges eller indgå i glasproduktion.
--
--   Mursten
--     facade:     kan genbruges som hele sten eller nedknuses til sekundært
--                 råmateriale.
--     vægge:      kan nyttiggøres ved nedknusning og genanvendelse.
--
--   PVC
--     tag:        kan genanvendes, hvis ubehandlet.
--     øvrige:     kan genanvendes og bruges til fremstilling af nye
--                 plastprodukter.

-- Spaerre. Rammer et navn ikke listen, sker der ingenting — og resultatet er en
-- rapport hvor et materiale mangler sin saetning. Det ser ud som om skabelonen
-- var ufuldstaendig, ikke som om der var en tastefejl. Derfor taelles der efter.
do $$
declare antal int;
begin
  select count(*) into antal
  from screening.materials
  where sentence_genbrug is not null or sentence_genanvendelse is not null;

  if antal <> 12 then
    raise exception 'saetninger: % materialer fik tekst, forventede 12', antal
      using hint = 'Et navn i VALUES-listen findes ikke i screening.materials. Sammenlign med screening_seed_lookups.';
  end if;
end $$;
