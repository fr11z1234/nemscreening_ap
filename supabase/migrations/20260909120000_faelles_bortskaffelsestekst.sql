-- En faelles bortskaffelsestekst pr. affaldstype, i stedet for en pr. materiale.
--
-- Kunden havde glemt at sige det: de tre bortskaffelsestekster er de SAMME for
-- alle materialer. De blev skrevet pr. materiale, fordi de bor sammen med
-- genbrugs- og genanvendelsessaetningen, og de to ER forskellige fra materiale
-- til materiale — beton knuses, trae genbruges. Men «farligt affald skal til et
-- godkendt modtageanlaeg» er den samme besked, uanset hvad der er farligt ved
-- det.
--
-- Derfor en kontakt frem for en udskiftning. Materialernes egne saetninger
-- roeres ikke af denne migration; slaas kontakten fra igen, skriver rapporten
-- praecis som for. Det er den vej, kommunen kan sende os: paapeger de, at en
-- tekst skal vaere unik for det enkelte materiale, er svaret et flueben og ikke
-- en udrulning.

-- ---------------------------------------------------------------------------
-- Hvor indstillingen bor
-- ---------------------------------------------------------------------------
-- `app_settings` er noegle/vaerdi og har staaet siden skemaet blev bygget, med
-- Eurofins-koden som eneste raekke. Den er stedet: en ny tabel med en enkelt
-- raekke ville vaere det samme med flere ord, og RLS staar her allerede rigtigt
-- — alle medlemmer laeser, kun kontoret skriver. Screeneren SKAL kunne laese
-- den: hun kan hente rapporten, og rapporten kan ikke tegnes uden.
--
-- Derfor er der heller ingen skemaaendring i denne fil. Den saetter en enkelt
-- vaerdi, og appen kan koere uden den — indstillingssiden skriver de samme
-- raekker. Filen findes, for at et miljo bygget op fra bunden staar med
-- kontakten slaaet til, som kunden har bedt om.

-- ---------------------------------------------------------------------------
-- Kontakten
-- ---------------------------------------------------------------------------
-- Noeglerne hedder det samme som kolonnerne paa `screening.materials`, saa det
-- er til at se, hvilken faelles tekst der traeder i stedet for hvilken:
-- `sentence_bortskaffelse`, `sentence_forurenet` og `sentence_asbest`.
--
-- DE TRE TEKSTER SEEDES IKKE. Det er kundens ord, og de hoerer i databasen —
-- samme regel som rapportens ovrige saetninger, der flyttede ud af koden med
-- materialepanelet. De skrives paa /indstillinger.
--
-- Er kontakten slaaet til, uden at nogen har skrevet dem, falder rapporten
-- tilbage paa materialernes egne saetninger. Se `faellesTekster` i
-- src/lib/indstillinger.ts: et tomt felt maa goere en rapport kortere, men det
-- maa ikke goere forureningsafsnittet tavst.
insert into screening.app_settings (key, value) values
  ('shared_disposal_text', 'true'::jsonb)
on conflict (key) do nothing;

comment on table screening.app_settings is
  'Noegle/vaerdi for det, der skal kunne rettes uden en udrulning. Laeses af alle medlemmer, skrives kun af kontoret.';
