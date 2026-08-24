alter table screening.lab_results
  add column if not exists asbestos_dusty boolean;

comment on column screening.lab_results.asbestos_dusty is
  'Sættes i hånden på resultatsiden, når asbest er påvist. true = støvende (farligt affald), false = ikke støvende (forurenet), null = ikke vurderet endnu. Kan ikke udledes af labsvaret — Eurofins oplyser kun om asbest er påvist.';