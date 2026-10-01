-- Civic Guard seed: departments + categories for demo org
do $$
declare org uuid;
declare dept_roads uuid; dept_water uuid; dept_elec uuid; dept_sani uuid; dept_drain uuid;
begin
  select id into org from organizations where slug='demo-municipality';

  insert into departments (org_id,name,code) values
    (org,'Roads & Infrastructure','ROADS'),
    (org,'Water Supply','WATER'),
    (org,'Electricity & Streetlights','ELEC'),
    (org,'Sanitation & Garbage','SANI'),
    (org,'Drainage & Sewerage','DRAIN')
  on conflict (org_id,code) do nothing;

  select id into dept_roads from departments where org_id=org and code='ROADS';
  select id into dept_water from departments where org_id=org and code='WATER';
  select id into dept_elec  from departments where org_id=org and code='ELEC';
  select id into dept_sani  from departments where org_id=org and code='SANI';
  select id into dept_drain from departments where org_id=org and code='DRAIN';

  insert into categories (org_id,name,slug,default_department_id,sla_hours,critical_sla_hours) values
    (org,'Potholes','potholes',dept_roads,48,12),
    (org,'Garbage','garbage',dept_sani,24,12),
    (org,'Streetlights','streetlights',dept_elec,24,6),
    (org,'Water Leakage','water-leakage',dept_water,12,6),
    (org,'Drainage','drainage',dept_drain,48,12),
    (org,'Road Damage','road-damage',dept_roads,72,24),
    (org,'Traffic Issues','traffic',dept_roads,48,6),
    (org,'Public Property Damage','property-damage',dept_roads,72,24),
    (org,'Other','other',dept_roads,72,24)
  on conflict (org_id,slug) do nothing;
end $$;
