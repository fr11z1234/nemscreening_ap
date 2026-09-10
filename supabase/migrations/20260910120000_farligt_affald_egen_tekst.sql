-- Farligt affald far sin egen tekst. Bortskaffelse er ikke laengere det samme.
--
-- Bortskaffelsen havde tre saetninger, og «Farligt affald» og «Bortskaffelse»
-- delte den ene af dem: `sentence_bortskaffelse` blev skrevet baade naar
-- Eurofins svarede rodt, og naar screeneren selv havde sat proven til
-- bortskaffelse. Begrundelsen var, at de to er den samme besked til
-- entreprenoren. Det er de ikke. Rodt er et bevis fra laboratoriet paa at
-- materialet ER farligt affald og skal til et godkendt modtageanlaeg;
-- screenerens bortskaffelse er en vurdering af et materiale, der er rent
-- eller slet ikke analyseret, og som bare skal vaek. Skrevet med samme ord
-- lover rapporten enten for lidt om det farlige eller for meget om det rene.
--
-- Derfor et fjerde felt. `sentence_bortskaffelse` bliver STAENDE og faar en
-- smallere betydning: screeneren valgte bortskaffelse, og svaret er rent eller
-- proven er uden analyse. Rodt svar slaar op i `sentence_farligt`.
--
-- Rangfolgen ligger i `bortskaffelsestekst` i src/lib/types.ts. Den er
-- samtidig blevet enklere: teksten folger nu maerket paa linjen en-til-en, og
-- screenerens eget valg slaar ikke laengere laboratoriets svar. Eurofins har
-- et konkret bevis paa standen, hvor screeneren antager.
alter table screening.materials
  add column sentence_farligt text;

-- Den gamle tekst kopieres over i det nye felt.
--
-- Praecis som da forurenet og asbest kom til: uden kopien ville de rode linjer
-- i enhver eksisterende rapport miste deres saetning uden en fejl nogen steder,
-- for de slaar op i et felt, der lige er blevet oprettet tomt. Kopien er ikke
-- et gaet paa hvad der BOR staa — den er den eneste skrivning, der bevarer det
-- rapporterne siger i dag. Kontoret deler dem ad i panelet bagefter.
update screening.materials
set sentence_farligt = coalesce(sentence_farligt, sentence_bortskaffelse)
where sentence_bortskaffelse is not null;

comment on column screening.materials.sentence_farligt is
  'Farligt affald: rodt svar fra laboratoriet.';
comment on column screening.materials.sentence_bortskaffelse is
  'Bortskaffelse: screeneren valgte det selv, og svaret er rent eller proven er uden analyse.';

-- Den faelles tekst faar samme fjerde felt.
--
-- Noeglen hedder det samme som kolonnen, som de tre andre goer. Og af samme
-- grund som ovenfor kopieres den faelles bortskaffelsestekst over, hvis
-- kontoret allerede har skrevet den: en rapport med faelles tekst slaaet til
-- ville ellers staa uden et ord om det farlige affald, indtil nogen opdagede
-- det paa /indstillinger. Har ingen skrevet den, indsaettes ingenting —
-- teksterne er kundens ord og seedes ikke.
insert into screening.app_settings (key, value)
select 'sentence_farligt', value
from screening.app_settings
where key = 'sentence_bortskaffelse'
on conflict (key) do nothing;
