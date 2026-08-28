-- Skabelonens andet sporgsmal i forureningsafsnittet.
--
--   «Hvordan skal disse materialer handteres i forbindelse med nedrivningen
--    (fx asbestregler, korrekt emballering, bortskaffelse som farligt affald)?»
--
-- Det forste sporgsmal — om der er materialer, der kan skabe risiko — svarer
-- rapporten selv pa: er der en gul eller rod prove, er svaret ja. Det her kan
-- den ikke. Svaret afhaenger af hvad der konkret er fundet, hvilke regler der
-- gaelder for det, og hvordan entreprenoren skal gribe det an — en faglig
-- vurdering, som kun et menneske kan skrive, og som gar til en kommune.
--
-- Feltet ligger pa sagen og ikke pa proven: det handler om nedrivningen som
-- helhed og naevner typisk flere materialer i samme saetning.
--
-- Teksten kan blive lang. Derfor `text` og ikke en laengdebegraensning, og
-- derfor et tekstfelt over flere linjer i UI'et.
alter table screening.cases
  add column contamination_handling_note text;
