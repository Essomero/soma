-- schema.sql - the practice database for the SQL refresh course.
--
-- Run this first, then seed.sql. It drops and recreates everything, so it is
-- safe to re-run and it will wipe whatever drills you left behind.
--
-- Target: PostgreSQL 14 or newer. Written and tested on 15.
--
-- The shape is Toggl's, trimmed to the tables that make good questions:
-- workspaces and members, projects and clients, time entries, rates that
-- change over time, and weekly allocations against weekly actuals.

drop table if exists allocation cascade;
drop table if exists rate cascade;
drop table if exists workspace_holiday cascade;
drop table if exists time_entry cascade;
drop table if exists task cascade;
drop table if exists project cascade;
drop table if exists client cascade;
drop table if exists membership cascade;
drop table if exists app_user cascade;
drop table if exists workspace cascade;

-- ── Tenancy ───────────────────────────────────────────
create table workspace (
  id               bigserial primary key,
  name             text        not null,
  default_timezone text        not null default 'UTC',
  billing_currency char(3)     not null default 'EUR',
  created_at       timestamptz not null default now()
);

-- "user" is a reserved word in SQL, so the table is app_user.
create table app_user (
  id              bigserial primary key,
  email           text not null unique,
  full_name       text not null,
  home_timezone   text not null default 'UTC',
  -- Contracted minutes per week. 2400 = 40 hours. Part-timers carry less.
  weekly_capacity integer not null default 2400 check (weekly_capacity between 0 and 10080)
);

-- A person belongs to a workspace through membership, and can belong to several.
create table membership (
  workspace_id bigint not null references workspace(id),
  user_id      bigint not null references app_user(id),
  role         text   not null check (role in ('admin', 'manager', 'member')),
  primary key (workspace_id, user_id)
);

-- ── Work ──────────────────────────────────────────────
create table client (
  id           bigserial primary key,
  workspace_id bigint not null references workspace(id),
  name         text   not null
);

create table project (
  id             bigserial primary key,
  workspace_id   bigint not null references workspace(id),
  client_id      bigint references client(id),
  name           text   not null,
  billable       boolean not null default true,
  budget_minutes integer,
  archived_at    timestamptz
);

create table task (
  id         bigserial primary key,
  project_id bigint not null references project(id),
  name       text   not null
);

-- ── Time ──────────────────────────────────────────────
-- A time entry is an interval, not a duration. `stopped_at` is null while the
-- timer runs. `duration_seconds` is stored so reports do not have to subtract,
-- and so a running entry can be read without a clock.
create table time_entry (
  id               bigserial primary key,
  workspace_id     bigint      not null references workspace(id),
  user_id          bigint      not null references app_user(id),
  project_id       bigint      references project(id),   -- null: time not yet assigned
  task_id          bigint      references task(id),
  description      text,
  started_at       timestamptz not null,
  stopped_at       timestamptz,
  duration_seconds integer     not null default 0 check (duration_seconds >= 0),
  start_timezone   text        not null,
  billable         boolean     not null default true,
  deleted_at       timestamptz,
  check (stopped_at is null or stopped_at > started_at)
);

-- ── Money ─────────────────────────────────────────────
-- Rates are temporal rows. A rate with no valid_to is the current one. A null
-- project_id means the workspace default; a null user_id means anyone.
create table rate (
  id           bigserial primary key,
  workspace_id bigint   not null references workspace(id),
  project_id   bigint   references project(id),
  user_id      bigint   references app_user(id),
  amount_minor integer  not null check (amount_minor >= 0),
  currency     char(3)  not null default 'EUR',
  valid_from   date     not null,
  valid_to     date,
  check (valid_to is null or valid_to > valid_from)
);

-- ── Planning ──────────────────────────────────────────
-- What a manager planned for a person on a project in a week, versioned so
-- "what did the plan say last Tuesday" has an answer.
create table allocation (
  id            bigserial primary key,
  workspace_id  bigint       not null references workspace(id),
  user_id       bigint       not null references app_user(id),
  project_id    bigint       not null references project(id),
  week_start    date         not null,        -- always a Monday
  percent       numeric(5,2) not null check (percent between 0 and 200),
  recorded_at   timestamptz  not null default now(),
  superseded_at timestamptz
);

-- Non-working days for a workspace. Weekends are handled by convention.
create table workspace_holiday (
  workspace_id bigint not null references workspace(id),
  day          date   not null,
  name         text   not null,
  primary key (workspace_id, day)
);

-- ── Indexes ───────────────────────────────────────────
-- Deliberately minimal, so the plan-reading lesson has something to fix.
-- Note what is missing: no index on time_entry(project_id), none on
-- time_entry(started_at) alone, and no covering index for the weekly report.
create index time_entry_ws_started_idx on time_entry (workspace_id, started_at);
create index time_entry_user_started_idx on time_entry (user_id, started_at);
create index project_ws_idx on project (workspace_id);
create index allocation_ws_week_idx on allocation (workspace_id, week_start);
create index rate_lookup_idx on rate (workspace_id, project_id, valid_from);
