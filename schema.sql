-- Soba · Upoznaj Sebe
-- Pokreće se jednom: Supabase > SQL Editor > New query > nalepi sve > Run.

-- 1) Ko ima pristup kom programu.
--    Vezano za mejl, jer uplata stigne pre nego što polaznik prvi put uđe u Sobu.
create table if not exists public.pristup (
  id            bigserial primary key,
  email         text not null,
  program       text not null,            -- 'koren', 'povratak', 'relaksacija-novac'
  aktivan       boolean not null default true,
  izvor         text,                     -- 'lemon', 'rucno'
  ls_order_id   text,
  ls_subscription_id text,
  istice        timestamptz,              -- za otkazane pretplate: do kada još važi
  azurirano     timestamptz not null default now(),
  unique (email, program)
);
create index if not exists pristup_email_idx on public.pristup (lower(email));

-- 2) Napredak kroz module.
create table if not exists public.napredak (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  program    text not null,
  modul      text not null,
  pozicija   integer not null default 0,  -- sekunde u videu
  gotovo     boolean not null default false,
  azurirano  timestamptz not null default now(),
  primary key (user_id, program, modul)
);

-- 3) Moj dnevnik: slobodne stranice, odvojene od kurseva.
create table if not exists public.dnevnik (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  datum      date not null default current_date,
  tekst      text not null default '',
  azurirano  timestamptz not null default now()
);
create index if not exists dnevnik_user_idx on public.dnevnik (user_id, datum desc);

-- Pravila: svako vidi i menja samo svoje.
alter table public.pristup  enable row level security;
alter table public.napredak enable row level security;
alter table public.dnevnik  enable row level security;

drop policy if exists "vidim svoj pristup" on public.pristup;
create policy "vidim svoj pristup" on public.pristup
  for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));
-- Upis u "pristup" radi samo webhook (service role) ili ti ručno iz Supabase-a.

drop policy if exists "moj napredak" on public.napredak;
create policy "moj napredak" on public.napredak
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "moj dnevnik" on public.dnevnik;
create policy "moj dnevnik" on public.dnevnik
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4) Pregled za Milicu (čita se samo iz Supabase-a, polaznici ga ne vide).
--    Ko nije ušao 14 dana i dokle je stigao. Bez dnevnika.
create or replace view public.pregled_polaznika
with (security_invoker = on) as
select p.email,
       p.program,
       p.aktivan,
       p.istice,
       max(n.azurirano)                         as poslednja_aktivnost,
       count(*) filter (where n.gotovo)         as odgledano_modula,
       (max(n.azurirano) < now() - interval '14 days') as udaljava_se
from public.pristup p
left join auth.users u on lower(u.email) = lower(p.email)
left join public.napredak n on n.user_id = u.id and n.program = p.program
group by p.email, p.program, p.aktivan, p.istice;
revoke all on public.pregled_polaznika from anon, authenticated;
