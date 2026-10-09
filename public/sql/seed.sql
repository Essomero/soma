-- seed.sql - deterministic practice data for the SQL refresh course.
--
-- Run schema.sql first, then this. Re-runnable: it truncates before loading.
-- Everything is generated from generate_series and md5, so the same database
-- comes back every time. No extensions, no external files, no network.
--
-- Anchor dates, so every number on every page lines up:
--   "today"        is 2026-09-21 (a Monday)
--   "now"          is 2026-09-21 09:30 UTC, which is what a running timer counts to
--   the last full week is 2026-09-14 to 2026-09-20
--   data starts   2025-09-01
--
-- Three workspaces, at three sizes, so a query can be cheap in one and slow in
-- another. Run the counts at the bottom of this file after loading.

-- ── Deterministic pseudo-random helpers ───────────────
-- md5 of the seed gives a stable 32-bit integer, so row N always comes out the
-- same. The cast goes through bigint because abs(int4_min) overflows.
create or replace function seed_rand(p_seed bigint, p_lo integer, p_hi integer)
returns integer
language sql immutable as $$
  select p_lo + (abs(('x' || substr(md5(p_seed::text), 1, 8))::bit(32)::int::bigint) % (p_hi - p_lo + 1))::int
$$;

create or replace function seed_pick(p_seed bigint, p_arr text[])
returns text
language sql immutable as $$
  select p_arr[1 + (abs(('x' || substr(md5(p_seed::text), 1, 8))::bit(32)::int::bigint)
                      % array_length(p_arr, 1))::int]
$$;

truncate allocation, rate, workspace_holiday, time_entry, task, project, client,
         membership, app_user, workspace
  restart identity cascade;

-- ── Workspaces ────────────────────────────────────────
insert into workspace (name, default_timezone, billing_currency) values
  ('Atlas Studio',    'Europe/Berlin', 'EUR'),
  ('Riverside',       'Europe/Lisbon', 'EUR'),
  ('Two-Person Shop', 'Europe/Warsaw', 'PLN');

-- ── People ────────────────────────────────────────────
-- 90 at Atlas, 10 at Riverside, 3 at the small shop. Ids land in that order,
-- which is why the workspace boundaries below are 90 and 100. Timezones stay
-- inside UTC-4 to UTC+3, the range the role lives in.
insert into app_user (email, full_name, home_timezone, weekly_capacity)
select
  lower(first_word) || '.' || lower(last_word) || u || '@example.com',
  first_word || ' ' || last_word,
  seed_pick(u * 17, array['Europe/Berlin','Europe/Lisbon','Europe/Madrid','Europe/Warsaw',
                          'Europe/Prague','America/Sao_Paulo','Europe/Amsterdam','Europe/Rome']),
  -- A few part-timers at 60 and 80 percent of a 40 hour week.
  case when u % 11 = 0 then 1440 when u % 7 = 0 then 1920 else 2400 end
from generate_series(1, 103) as u,
     lateral (select seed_pick(u * 11, array['Ana','Marta','Jonas','Lena','Tomas','Ivana','Pedro','Sofia','Milan','Clara','Diego','Nina','Rasmus','Elena','Filip','Hana','Juris','Katja','Lukas','Maja']) as first_word) f,
     lateral (select seed_pick(u * 13, array['Kovac','Silva','Novak','Petrov','Horvat','Nowak','Santos','Berg','Lindqvist','Muller','Costa','Zajac','Eriksen','Marek','Dubois','Rossi','Jansen','Walter','Brennan','Oliveira']) as last_word) l;

-- ── Membership ────────────────────────────────────────
-- One admin per workspace, several managers at Atlas, everyone else a member.
insert into membership (workspace_id, user_id, role)
select
  case when u.id <= 90 then 1 when u.id <= 100 then 2 else 3 end,
  u.id,
  case when u.id in (1, 91, 101) then 'admin'
       when u.id in (2, 3, 4, 5, 6, 92, 93) then 'manager'
       else 'member' end
from app_user u;

-- ── Clients and projects ──────────────────────────────
insert into client (workspace_id, name)
select w.ws,
       seed_pick(w.ws * 100 + c, array['Nordbank','Helio Energy','Public Sector Tender',
         'Cobalt Retail','Fields Institute','Sandvik Marine','Lumen Health','Orbit Logistics',
         'Terraform Realty','Quiet Software','Wren Media','Delta Foods'])
from (values (1), (2), (3)) as w(ws),
     generate_series(1, case w.ws when 1 then 8 when 2 then 4 else 2 end) as c;

insert into project (workspace_id, client_id, name, billable, budget_minutes, archived_at)
select
  w.ws,
  (select c.id from client c where c.workspace_id = w.ws order by c.id limit 1 offset (p % 3)),
  seed_pick(w.ws * 1000 + p, array['Migration to 2.0','Capacity rebuild','Payroll integration',
    'Brand refresh','Data warehouse','Mobile app','Support retainer','Audit preparations',
    'Internal tooling','Onboarding revamp','Report exports','API partnership']) || ' ' || p,
  (p % 9 <> 0),
  case when p % 4 = 0 then seed_rand(w.ws * 500 + p, 2000, 40000) end,
  case when w.ws = 1 and p in (7, 19) then timestamptz '2026-06-01 10:00+02' end
from (values (1), (2), (3)) as w(ws),
     generate_series(1, case w.ws when 1 then 28 when 2 then 9 else 3 end) as p;

insert into task (project_id, name)
select p.id,
       seed_pick(p.id * 31 + t, array['Kickoff','Discovery','Design review','Build','QA pass',
         'Deploy','Retro','Client call','Documentation','Bugfix'])
from project p, generate_series(1, 3 + (p.id % 4)) as t;

-- ── Rates ─────────────────────────────────────────────
-- A workspace default (null project, null user), then a project rate for every
-- billable project. Two projects get a price rise on 2026-04-01, which is what
-- makes the temporal join interesting.
insert into rate (workspace_id, project_id, user_id, amount_minor, currency, valid_from, valid_to)
select w.ws, null, null,
       case w.ws when 1 then 8500 when 2 then 7200 else 19000 end,
       case w.ws when 1 then 'EUR' when 2 then 'EUR' else 'PLN' end,
       date '2025-01-01', null
from (values (1), (2), (3)) as w(ws);

insert into rate (workspace_id, project_id, amount_minor, currency, valid_from, valid_to)
select p.workspace_id, p.id,
       case p.workspace_id when 1 then 9000 + (p.id % 5) * 1500
                           when 2 then 8000 + (p.id % 3) * 1000
                           else 20000 end,
       case p.workspace_id when 3 then 'PLN' else 'EUR' end,
       date '2025-01-01', null
from project p
where p.billable;

update rate set valid_to = date '2026-04-01' where workspace_id = 1 and project_id = 3;
insert into rate (workspace_id, project_id, amount_minor, currency, valid_from, valid_to)
values (1, 3, 14500, 'EUR', date '2026-04-01', null);

update rate set valid_to = date '2026-04-01' where workspace_id = 1 and project_id = 22;
insert into rate (workspace_id, project_id, amount_minor, currency, valid_from, valid_to)
values (1, 22, 11000, 'EUR', date '2026-04-01', null);

-- ── Holidays ──────────────────────────────────────────
insert into workspace_holiday (workspace_id, day, name) values
  (1, date '2025-12-25', 'Christmas Day'),
  (1, date '2025-12-26', 'Second Christmas Day'),
  (1, date '2026-01-01', 'New Year'),
  (1, date '2026-04-03', 'Good Friday'),
  (1, date '2026-04-06', 'Easter Monday'),
  (1, date '2026-05-01', 'Labour Day'),
  (1, date '2026-10-03', 'Day of German Unity'),
  (2, date '2025-12-25', 'Christmas Day'),
  (2, date '2026-01-01', 'New Year'),
  (2, date '2026-04-03', 'Good Friday'),
  (2, date '2026-06-10', 'Portugal Day'),
  (3, date '2026-01-01', 'New Year'),
  (3, date '2026-05-01', 'Labour Day');

-- ── Time entries ──────────────────────────────────────
-- For every person, every workday in the range, five to nine entries at Atlas
-- and three to five at the smaller workspaces. About one weekend day in twelve
-- also has work, four percent of entries have no project yet, three percent were
-- recorded while travelling in another timezone, and two percent were deleted.
insert into time_entry (workspace_id, user_id, project_id, description,
                        started_at, stopped_at, duration_seconds, start_timezone,
                        billable, deleted_at)
select
  w.ws,
  u.id,
  case when seed_rand(u.id * 7919 + d.j * 131 + e.i, 1, 100) <= 4 then null else pr.id end,
  seed_pick(u.id * 104729 + d.j * 613 + e.i, array['Client call','Pairing on the export',
    'Capacity view polish','Bug triage','Schema review','Standup','Report tuning',
    'Migration dry run','Code review','Writing tests','Design feedback','Onboarding docs']),
  (d.day + make_interval(mins => start_min - (start_min % 5))) at time zone u.home_timezone,
  (d.day + make_interval(mins => start_min - (start_min % 5) + len_min)) at time zone u.home_timezone,
  len_min * 60,
  case when seed_rand(u.id * 6151 + d.j * 97 + e.i, 1, 100) <= 3
       then seed_pick(u.id * 4241 + d.j, array['America/New_York','Europe/Lisbon',
            'Asia/Kolkata','America/Sao_Paulo','Europe/Warsaw'])
       else u.home_timezone end,
  coalesce(pr.billable, w.ws = 3),
  case when d.day < date '2026-09-01'
         and seed_rand(u.id * 3571 + d.j * 53 + e.i, 1, 100) <= 2
       then timestamptz '2026-09-01 12:00+02' end
from (values (1), (2), (3)) as w(ws)
join lateral (
  select u.id, u.home_timezone
    from app_user u
   where u.id between case w.ws when 1 then 1 when 2 then 91 else 101 end
                   and case w.ws when 1 then 90 when 2 then 100 else 103 end
) u on true
join lateral (
  select gs::date as day, row_number() over (order by gs)::int as j
    from generate_series(date '2025-09-01', date '2026-09-20', interval '1 day') gs
   where extract(isodow from gs) < 6
      or seed_rand(u.id * 104729 + (gs::date - date '2025-09-01'), 1, 12) = 1
) d on true
join lateral (
  select i from generate_series(1, case w.ws when 1 then 5 else 3 end
                                 + seed_rand(u.id * 7919 + d.j, 0, case w.ws when 1 then 4 else 2 end)) as i
) e on true
cross join lateral (
  -- Start between 08:00 and 17:00, length 15 to 240 minutes in quarter hours.
  select seed_rand(u.id * 7919 + d.j * 131 + e.i, 480, 1020) as start_min,
         seed_rand(u.id * 3253 + d.j * 17 + e.i, 1, 16) * 15  as len_min
) tm
left join lateral (
  -- Pick the Nth project of this workspace, N derived from the row's own seed.
  -- project.id is global across workspaces, so a modulo of the id would pick
  -- nothing for the smaller workspaces.
  select p.id, p.billable
    from project p
   where p.workspace_id = w.ws
   order by p.id
   offset (abs(('x' || substr(md5((u.id * 104729 + d.j * 131 + e.i)::text), 1, 8))::bit(32)::int::bigint)
             % (case w.ws when 1 then 28 when 2 then 9 else 3 end))::int
   limit 1
) pr on true;

-- Give about 40 percent of the assigned entries a task from their own project.
update time_entry te
   set task_id = (
     select t.id from task t
      where t.project_id = te.project_id
      order by t.id
      offset (te.id % 4)
      limit 1
   )
 where te.project_id is not null
   and te.id % 5 in (0, 1);

-- The interval is the truth; the stored duration follows from it. On the two
-- daylight-saving days in March and October the two disagree by an hour, which
-- is the point of the exercise, so the real elapsed time wins.
update time_entry
   set duration_seconds = extract(epoch from stopped_at - started_at)::int
 where stopped_at is not null
   and duration_seconds <> extract(epoch from stopped_at - started_at)::int;

-- Deliberate edge cases, few enough to count and find.
insert into time_entry (workspace_id, user_id, project_id, description,
                        started_at, stopped_at, duration_seconds, start_timezone, billable)
values
  -- Two entries that cross midnight in local time.
  (1, 2,  1, 'Late deploy, Berlin',      timestamptz '2026-08-11 22:30+02', timestamptz '2026-08-12 00:15+02',  6300, 'Europe/Berlin', true),
  (1, 3,  2, 'Incident call, Berlin',    timestamptz '2026-09-03 23:45+02', timestamptz '2026-09-04 01:00+02',  4500, 'Europe/Berlin', true),
  -- The spring-forward day is 23 hours long. This shift is 2h30m of real time.
  (1, 4,  3, 'Spring forward shift',     timestamptz '2026-03-29 00:30+01', timestamptz '2026-03-29 04:00+02',  9000, 'Europe/Berlin', true),
  -- The fall-back day is 25 hours long. This shift is 5h30m of real time.
  (1, 4,  3, 'Fall back shift',          timestamptz '2026-10-24 23:30+02', timestamptz '2026-10-25 04:00+01', 19800, 'Europe/Berlin', true),
  -- Recorded in New York, billed at home in Lisbon.
  (2, 91, 29, 'Travel week, New York',   timestamptz '2026-05-12 15:00-04', timestamptz '2026-05-12 16:30-04',  5400, 'America/New_York', true);

-- One running timer per workspace. stopped_at is null, and duration_seconds is
-- elapsed time as of 2026-09-21 09:30 UTC.
insert into time_entry (workspace_id, user_id, project_id, description,
                        started_at, stopped_at, duration_seconds, start_timezone, billable)
values
  (1,   1,  4, 'Timer still running', timestamptz '2026-09-21 08:15+02', null, 11700, 'Europe/Berlin', true),
  (2,  92, 30, 'Timer still running', timestamptz '2026-09-21 08:05+01', null,  8700, 'Europe/Lisbon', true),
  (3, 101, 38, 'Timer still running', timestamptz '2026-09-21 08:45+02', null,  9900, 'Europe/Warsaw', true);

-- ── Allocations ───────────────────────────────────────
-- Sixteen weeks of planning for the Atlas people, one or two projects each,
-- recorded a week before the week it plans.
insert into allocation (workspace_id, user_id, project_id, week_start, percent, recorded_at, superseded_at)
select
  1,
  u.id,
  p.id,
  wk.week_start,
  seed_rand(u.id * 6151 + wk.n * 23 + p.id, 10, 60),
  timestamptz '2026-06-01 09:00+02' + make_interval(days => wk.n * 7),
  null
from generate_series(1, 90) as u(id)
cross join (
  select n, (date '2026-06-01' + (n - 1) * 7)::date as week_start
    from generate_series(1, 16) as n
) wk
join lateral (
  select p.id
    from project p
   where p.workspace_id = 1 and p.archived_at is null
   order by (p.id + u.id * 7 + wk.n) % 28
   limit case when seed_rand(u.id * 31 + wk.n, 1, 100) <= 30 then 2 else 1 end
) p on true;

-- One person's week 8 plan changed twice. The superseded rows are what makes
-- "what did the plan say last Tuesday" answerable.
insert into allocation (workspace_id, user_id, project_id, week_start, percent, recorded_at, superseded_at)
values
  (1, 5, 5, date '2026-07-20', 40, timestamptz '2026-07-13 10:00+02', timestamptz '2026-07-16 14:00+02'),
  (1, 5, 5, date '2026-07-20', 55, timestamptz '2026-07-16 14:00+02', timestamptz '2026-07-21 09:15+02'),
  (1, 5, 5, date '2026-07-20', 30, timestamptz '2026-07-21 09:15+02', null);

-- ── Statistics ────────────────────────────────────────
-- Without this the planner guesses, and the plan-reading lesson needs real
-- plans rather than guesses.
analyze;

drop function if exists seed_rand(bigint, integer, integer);
drop function if exists seed_pick(bigint, text[]);

-- ── What you just loaded ──────────────────────────────
select w.name,
       (select count(*) from membership m where m.workspace_id = w.id)  as people,
       (select count(*) from project p   where p.workspace_id = w.id)   as projects,
       (select count(*) from time_entry t where t.workspace_id = w.id)  as entries,
       (select count(*) from allocation a where a.workspace_id = w.id)  as allocations
  from workspace w
 order by w.id;
