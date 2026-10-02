-- Benches table. Allowed values of place and type are kept in sync with
-- PLACES in src/utils/place.ts and BENCH_TYPES in src/utils/tags.ts
create table public.benches (
  id bigint generated always as identity primary key,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  place text not null check (place in ('street', 'park', 'yard', 'square')),
  type text not null check (type in ('backrest', 'backless')),
  date date not null default (now() at time zone 'Europe/Belgrade')::date,
  created_at timestamptz not null default now()
);

alter table public.benches enable row level security;

create policy "Anyone can read benches"
  on public.benches for select
  to anon, authenticated
  using (true);

create policy "Anyone can add benches"
  on public.benches for insert
  to anon, authenticated
  with check (true);

-- Supabase grants everything on new tables to the API roles. Narrow it down:
-- the site may read and add, and on insert only set the four form fields,
-- so date and created_at always come from the defaults. Editing and
-- deleting is left to the dashboard.
revoke all on table public.benches from anon, authenticated;
grant select on table public.benches to anon, authenticated;
grant insert (latitude, longitude, place, type)
  on table public.benches to anon, authenticated;

-- Lets open pages receive new benches without reloading
alter publication supabase_realtime add table public.benches;
