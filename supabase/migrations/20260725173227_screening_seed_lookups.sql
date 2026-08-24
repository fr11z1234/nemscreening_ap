-- sort_order bevarer raekkefolgen fra det nuvaerende Excel-ark.
-- Vaelgeren i appen sorterer alfabetisk og loefter "senest brugt pa sagen" op i toppen.
insert into screening.materials (name, sort_order)
select m.name, m.ord
from unnest(array[
  'Asbest plader',
  'Asfalt',
  'Beton (undtagen, gasbeton, letbeton)',
  'Elektronik',
  'Eternit, asbestfri',
  'Fugemasse',
  'Gasbeton',
  'Gips',
  'Glas',
  'Glasseret tegl / Fliser / Klinker',
  'Glasuld',
  'Jern og metal',
  'Leca',
  'Letbeton',
  'Linoleum',
  'Maling',
  'Mursten',
  'Puds',
  'PVC',
  'Skorsten',
  'Stenuld',
  'Tagpap',
  'Tapet',
  'Træ',
  'Træ, trykimprægneret',
  'Vinduer',
  'Vinyl',
  'Andet byggeaffald indeholdende asbest',
  'Terrazzo',
  'Blandinger af beton og asfalt',
  'Blandinger af materialer, fra natursten, uglaseret tegl og beton',
  'Flamingo',
  'Glasfiber',
  'Indskudsler',
  'Kabler',
  'Koksvægge',
  'Lysstofrør',
  'Natursten, fx granit og flint',
  'Pap og papir',
  'Plast',
  'Pore beton',
  'Sandblæsningssand (fra metal og plast)',
  'Sandblæsningssand (undtagen fra metal og plast)',
  'Sanitet',
  'Slagge',
  'Støbeasfalt',
  'Termoruder',
  'Uglaseret tegl (mur- og tagsten)',
  'Andet byggeaffald indeholdende farlige stoffer',
  'Andet byggeaffald uden asbest eller farlige stoffer',
  'Andet byggeaffald indeholdende PCB, farligt affald',
  'Isolering',
  'Isolering m. asbest',
  'Kit',
  'Tæppe'
]) with ordinality as m(name, ord)
on conflict (name) do nothing;

insert into screening.sample_types (name, sort_order)
select s.name, s.ord
from unnest(array[
  'Rød maling',
  'Hvid maling',
  'Sort maling',
  'Grøn maling',
  'Gul maling',
  'Klinke og klæb',
  'Lak',
  'Lim',
  'Blandet maling',
  'Rent',
  'Brun maling',
  'Fuger',
  'Asbest',
  'Sod',
  'Ludbehandling',
  'Grå maling',
  'Mulig asbest',
  'Blå maling',
  'Beige maling',
  'Orange maling',
  'Ubehandlet'
]) with ordinality as s(name, ord)
on conflict (name) do nothing;

-- Koden i Eurofins-skabelonens forste raekke. Ligger som indstilling, sa den kan
-- aendres uden en ny deployment hvis Eurofins udsteder en ny aftale.
insert into screening.app_settings (key, value) values
  ('eurofins_analyses_details', '"YVD5SC230009"'::jsonb)
on conflict (key) do nothing;