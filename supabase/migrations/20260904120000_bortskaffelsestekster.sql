-- Bortskaffelsen far tre saetninger i stedet for en.
--
-- Der stod EN tekst pa materialet, og den blev sat pa linjen uanset om
-- laboratoriet svarede gult eller rodt. Men de tre tilfaelde kraever hver sit
-- af entreprenoren: forurenet affald skal udsorteres, farligt affald skal til
-- et godkendt modtageanlaeg, og asbest skal befugtes, emballeres stovtaet og
-- holdes adskilt fra alt andet. En faelles saetning maa enten love for lidt om
-- asbesten eller for meget om det forurenede.
--
-- Kontoret havde selv fundet en vej udenom: asbestteksten lagt pa de
-- materialer, der HEDDER noget med asbest — «Asbest plader», «Isolering m.
-- asbest». Det virker kun, hvis screeneren ramte det rigtige navn i marken.
-- Svarer Eurofins «Pavist» pa en prove, der er registreret som «Eternit,
-- asbestfri», skal asbestteksten frem alligevel. Det er analysen der ved det,
-- ikke navnet.
--
-- `sentence_bortskaffelse` bliver STAENDE og skifter ikke betydning: den
-- daekker bade screenerens eget valg og et rodt svar. Farligt affald og
-- bortskaffelse er den samme besked. Derfor er der kun to nye kolonner, og
-- derfor aendrer ingen af de fem materialer, kontoret allerede har skrevet
-- tekst pa, ordlyd ved denne migration.
--
-- Rangfolgen ligger i `bortskaffelsestekst` i src/lib/types.ts, ved siden af
-- `faktiskHandtering`, sa de to regler kan laeses sammen.
alter table screening.materials
  add column sentence_forurenet text,
  add column sentence_asbest    text;

-- Den gamle tekst kopieres over i de to nye.
--
-- Uden det her ville migrationen GORE rapporter tavse. «Asbest plader» har sin
-- asbesttekst staaende i `sentence_bortskaffelse` — det var det eneste felt der
-- fandtes — og efter reglen herunder slaar en asbestprove op i
-- `sentence_asbest`. Var den tom, ville saetningen forsvinde ud af rapporten
-- uden en fejl nogen steder. Det samme for et gult svar paa «Andet byggeaffald
-- indeholdende farlige stoffer».
--
-- Kopien er derfor ikke et gaet paa, hvad der BOR staa, men den eneste
-- skrivning der bevarer det, rapporterne siger i dag: alle tre felter giver
-- samme svar som det ene gjorde for. Kontoret kan sa dele dem ad i panelet, et
-- materiale ad gangen, og se forskellen med det samme.
update screening.materials
set sentence_forurenet = coalesce(sentence_forurenet, sentence_bortskaffelse),
    sentence_asbest    = coalesce(sentence_asbest,    sentence_bortskaffelse)
where sentence_bortskaffelse is not null;

comment on column screening.materials.sentence_bortskaffelse is
  'Bortskaffelse: screeneren valgte det selv, eller svaret er farligt affald.';
comment on column screening.materials.sentence_forurenet is
  'Forurenet affald: gult svar pa en prove, screeneren havde sat til genbrug eller genanvendelse.';
comment on column screening.materials.sentence_asbest is
  'Asbest pavist. Overruler begge de andre, uanset hvad screeneren valgte.';
