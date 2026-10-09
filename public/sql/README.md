# SQL practice kit

A Postgres database shaped like a time-tracking product: 3 workspaces, 103 people, 194,168 time entries, rates that change over time, and 16 weeks of planning. Small enough to load in nine seconds, large enough that a query plan means something.

Two files:

- `schema.sql` - ten tables, the constraints, and a deliberately thin set of indexes so the plan-reading lesson has something to fix. Wipes and recreates everything, safe to re-run.
- `seed.sql` - deterministic data. No extensions, no network, no random seeds to write down: md5 of a row number is the randomness, so the same database comes back every time.

## Start clean

The kit is disposable, so the safest first move is to clear out whatever an earlier attempt left behind. Nothing here touches Postgres.app's own server on 5432, or any other database on the machine.

```sh
scripts/sql-practice.sh status     # is anything up, and what is loaded in it
scripts/sql-practice.sh destroy    # stops the cluster and deletes pg/drills
docker rm -f sqldrills             # only if you took the docker path
rm -rf ~/pgdata/sqlrefresh         # only if you made your own cluster
```

`reset` reloads the database and keeps the cluster. `destroy` removes the cluster. Drill tables in a mess need the first. A day of untracked experiments needs the second.

## Load it

One script does everything, on any Unix machine:

```sh
scripts/sql-practice.sh doctor    # what this machine has: postgres, docker, paths, ports
scripts/sql-practice.sh up        # create the cluster, start it, load schema and seed
scripts/sql-practice.sh psql      # an open prompt against the drills database
scripts/sql-practice.sh query "select count(*) from time_entry"
scripts/sql-practice.sh status    # is it up, and what is loaded
scripts/sql-practice.sh reset     # drop everything and reload the seed, about 9 seconds
scripts/sql-practice.sh stop      # stop it, keep the data
scripts/sql-practice.sh destroy   # stop it and delete the data directory
scripts/sql-practice.sh help      # the same list, also as -h and --help
```

It is self-contained on purpose:

- **It finds PostgreSQL itself.** PATH first, then Postgres.app, Homebrew on both architectures, Debian and Ubuntu (`/usr/lib/postgresql/*/bin`), Fedora and RHEL (`/usr/pgsql-*/bin`), then `/usr/bin`.
- **If there is no local PostgreSQL but there is docker, it uses docker.** Same commands, no flags. `doctor` tells you which mode you are in.
- **If the SQL files are not next to the script, it downloads them** from the published copy at `/sql/`, so a machine with this one file and curl is enough.
- **It uses port 55432, not 5432.** Port 5432 is where Postgres.app and most distro installs live, and this scratch cluster must not take it. If 55432 is taken as well, it walks up to the next free port, and it remembers the choice so every later command talks to the same server instead of guessing a new port.
- **Data lives in `pg/drills`** inside the repo, which is gitignored, so the cluster never lands in a commit. It listens on 127.0.0.1 only, with trust auth.

Environment overrides, if the defaults collide with something: `SQL_PRACTICE_PORT`, `SQL_PRACTICE_DB`, `SQL_PRACTICE_DATA`, `SQL_PRACTICE_MODE` (`local` or `docker`), `SQL_PRACTICE_KIT_URL`, `SQL_PRACTICE_CONTAINER`.

**By hand, if you prefer.** Two things catch people here, and neither is visible in the commands.

**The role.** `initdb -U postgres` creates exactly one superuser, called `postgres`, while `createdb` and `psql` default to your operating system username. Without `-U postgres` every command fails with `FATAL: role "yourname" does not exist`, which reads like a broken install and is a missing flag.

**The port.** A cluster that will not start is usually a port already in use, and the log names the process holding it. Pick a port nothing else uses: Postgres.app takes 5432, and this kit's own cluster takes 55432.

```sh
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"

initdb -D ~/pgdata/sqlrefresh -U postgres --auth=trust        # first time only
pg_ctl -D ~/pgdata/sqlrefresh -o "-p 5455" -l ~/pgdata/sqlrefresh.log start

createdb -h 127.0.0.1 -p 5455 -U postgres drills
psql -h 127.0.0.1 -p 5455 -U postgres -d drills -v ON_ERROR_STOP=1 -f schema.sql
psql -h 127.0.0.1 -p 5455 -U postgres -d drills -v ON_ERROR_STOP=1 -f seed.sql
psql "postgresql://postgres@127.0.0.1:5455/drills"
```

Already have a server running? Then it is just the last three lines, with your own port and `-U postgres`.

**And with a cluster of your own, the script can still drive it**, which keeps one interface for everything:

```sh
SQL_PRACTICE_DATA=~/pgdata/sqlrefresh SQL_PRACTICE_PORT=5455 scripts/sql-practice.sh up
```

Both files are re-runnable. `schema.sql` drops and recreates the ten tables, so running it twice in a row is fine.

**Docker, by hand,** if you would rather not use the script:

```sh
docker run --name sqldrills -e POSTGRES_PASSWORD=drills -p 55432:5432 -d postgres:15
docker exec -i sqldrills psql -U postgres -c "create database drills"
docker exec -i sqldrills psql -U postgres -d drills < schema.sql
docker exec -i sqldrills psql -U postgres -d drills < seed.sql
docker exec -it sqldrills psql -U postgres -d drills
```

## Connect

```
postgresql://postgres@127.0.0.1:55432/drills
```

or, on the command line:

```sh
psql "postgresql://postgres@127.0.0.1:55432/drills"
```

If the only thing between you and typing is not knowing what to type, these are the ones worth memorising in the first ten minutes:

| Command | What it does |
|---|---|
| `\l` | list databases |
| `\c drills` | connect to one |
| `\dt` | list tables |
| `\d time_entry` | describe a table: columns, types, nullability, keys, indexes |
| `\d+ time_entry` | the same, plus storage and comments |
| `\x` | toggle expanded output, for wide rows. `\x auto` does it only when needed |
| `\timing` | print how long each statement took. Turn this on immediately |
| `\pset linestyle unicode` | box-drawing borders instead of dashes |
| `\pset null '[null]'` | print NULLs as `[null]`. The default is a blank space, which looks like an empty string |
| `\pset format csv` | or `html`, `latex`, `wrapped`, `unaligned`. No `json` in psql 15 |
| `\e` | open the last query in your editor |
| `\i file.sql` | run a file |
| `\watch 2` | re-run the last query every 2 seconds |
| `\?` and `\h select` | help, and syntax help for a statement |
| `\q` | quit |

Tab completion works on table names, column names and keywords. There is no reason to type a column name you are unsure of.

Put those settings in `~/.psqlrc` and every session starts readable, with a colored prompt:

```text
\pset linestyle unicode
\pset null '[null]'
\x auto
\timing on

\set PROMPT1 '%033[1;36m%/%033[0m%R%# '
\set PROMPT2 '%033[1;33m%...%033[0m%R%# '
```

`%033` is ESC written in octal. Keep those escapes bare: wrapping them in `%[ ... %]`, which is the form most recipes use, makes psql 15 hoist both sequences to the front of the prompt, so the reset cancels the color and the name renders plain. Capture the bytes with `script -q /tmp/session.txt psql ...` and `cat -v` to see it for yourself. The trade is that psql counts the escape bytes as visible, so a very long command can wrap a character or two early. Note that `-X` skips this file, and that psql itself has no syntax highlighting: for colored, sortable, boxed results install `pspg` (`brew install pspg`, then `\pset pager pspg`), and for highlighted SQL as you type, `pgcli`.

## What you just loaded

| Workspace | People | Projects | Entries | Allocations |
|---|---|---|---|---|
| Atlas Studio | 90 | 28 | 179,435 | 1,860 |
| Riverside | 10 | 9 | 11,346 | 0 |
| Two-Person Shop | 3 | 3 | 3,387 | 0 |

Two facts make this the shape of a real time tracker, and most of the interesting queries come from them:

1. **A time entry is an interval, not a duration.** It has `started_at`, `stopped_at` (null while running), and a stored `duration_seconds` that follows from the interval.
2. **A rate is a temporal row**, with `valid_from` and `valid_to`. A null `valid_to` means it is still current. Joining entries to rates without a date range is the classic way to inflate money.

Anchor dates, so every worked example lines up: today is 2026-09-21, a Monday. The last full week is 2026-09-14 to 2026-09-20. A running timer counts to 2026-09-21 09:30 UTC. Data starts 2025-09-01.

Edge cases, small enough to count and find when a lesson asks you to:

- 3 running timers, `stopped_at` is null
- 3,703 soft-deleted entries
- 7,820 entries with no project assigned
- 5,356 entries recorded in a timezone that is not the person's home timezone
- 6,395 entries on a weekend
- 2 closed rate rows, on projects 3 and 22 at Atlas
- 2 superseded allocation rows, for person 5 in the week of 2026-07-20
- one shift on each daylight-saving day in Berlin: 2h30m of real time on 2026-03-29, 5h30m on 2026-10-25

## Reading plan

Nine lessons, roughly three to four hours including the typing. Every query in them runs against this database.

**Lessons 1 and 2 are the front door.** Lesson 1 is setup only: a database on your machine, a prompt that works, and a first look at the schema. Lesson 2 is the orientation that makes everything after it readable, and you type commands in psql in every section of it rather than reading about them.

**Two hours, if that is all you have:** lessons 1 and 2, then lesson 4 for aggregates and bucketing, then lesson 7 for window functions. Skim lesson 8's section on reading a plan. Do lesson 4's drills by hand, even if you skip the rest.

**Four hours:** all nine, in order. Lesson 8 pays off last, because reading a plan only helps once you can write the query.

After any `reset`, the kit reloads to exactly these numbers. If a count differs, the seed did not finish and you should run `reset` again.
