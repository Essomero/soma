#!/usr/bin/env bash
#
# sql-practice.sh - the practice database for the SQL refresh course.
#
# Self-contained: on a Unix machine with a local PostgreSQL OR with docker, this
# brings up a scratch database, loads the schema and the seed, and leaves you a
# prompt to type queries in. If the SQL files are not next to this script, it
# downloads them.
#
#   ./sql-practice.sh doctor     what this machine has
#   ./sql-practice.sh up         create, start, and load if needed
#   ./sql-practice.sh reset      drop everything and reload the seed (9 seconds)
#   ./sql-practice.sh psql       an open prompt
#   ./sql-practice.sh query "select count(*) from time_entry"
#   ./sql-practice.sh status     is it up, and what is in it
#   ./sql-practice.sh conn       print the connection string
#   ./sql-practice.sh stop       stop it, keep the data
#   ./sql-practice.sh destroy    stop it and delete the data directory
#   ./sql-practice.sh help       this message, and the same as -h and --help
#
# Everything listens on 127.0.0.1 only, with trust auth. It is a scratch
# database for practice, so do not expose the port.
#
# Environment overrides:
#   SQL_PRACTICE_PORT   default 55432, and the next free port if that is taken.
#                       Deliberately not 5432: that is where Postgres.app and most
#                       distro installs live, and this scratch cluster must not take it.
#   SQL_PRACTICE_DB     default drills
#   SQL_PRACTICE_DATA   default ./pg/drills next to this script
#   SQL_PRACTICE_KIT_URL  where to fetch schema.sql and seed.sql from if the
#                       local copy is missing (default: the published site)
#   SQL_PRACTICE_MODE   local | docker, normally detected
#   SQL_PRACTICE_CONTAINER  docker container name, default sqldrills
#
# Tested on macOS with Postgres.app and on Linux with a distro PostgreSQL.
# Bash 3.2 compatible, because macOS still ships that.

set -euo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SELF_DIR/.." && pwd)"

DB="${SQL_PRACTICE_DB:-drills}"
CONTAINER="${SQL_PRACTICE_CONTAINER:-sqldrills}"
KIT_URL="${SQL_PRACTICE_KIT_URL:-https://soma.mayanja.dev/sql}"
KIT_CACHE="${SQL_PRACTICE_KIT_CACHE:-$HOME/.sql-practice/kit}"
SOCKET_DIR="${SQL_PRACTICE_SOCKET:-/tmp}"

# Data directory: next to this script by default, wherever it was copied to.
if [[ -n "${SQL_PRACTICE_DATA:-}" ]]; then
  DATA_DIR="$SQL_PRACTICE_DATA"
elif [[ -d "$ROOT_DIR/pg" || -w "$ROOT_DIR" ]]; then
  DATA_DIR="$ROOT_DIR/pg/drills"
else
  DATA_DIR="$HOME/.sql-practice/drills"
fi

# ── Where are the SQL files? ──────────────────────────
# Any of: next to this script, ./sql, the repo's public/sql, or a cached copy
# fetched from KIT_URL.
find_kit() {
  local candidates=("$SELF_DIR" "$SELF_DIR/sql" "$ROOT_DIR/public/sql" "$KIT_CACHE")
  for dir in "${candidates[@]}"; do
    if [[ -f "$dir/schema.sql" && -f "$dir/seed.sql" ]]; then
      echo "$dir"
      return 0
    fi
  done
  return 1
}

fetch_kit() {
  # Never inside DATA_DIR: initdb needs an empty directory to initialise, so a
  # download that lands there breaks the very first start.
  local dest="$KIT_CACHE"
  command -v curl >/dev/null 2>&1 || { echo "curl is required to download the SQL files" >&2; return 1; }
  mkdir -p "$dest"
  # Progress goes to stderr: ensure_kit's stdout is the path, captured by the
  # caller, so anything else printed here would become part of that path.
  echo "downloading schema.sql and seed.sql from $KIT_URL" >&2
  curl -fsSL "$KIT_URL/schema.sql" -o "$dest/schema.sql" || { echo "could not fetch $KIT_URL/schema.sql" >&2; return 1; }
  curl -fsSL "$KIT_URL/seed.sql" -o "$dest/seed.sql" || { echo "could not fetch $KIT_URL/seed.sql" >&2; return 1; }
  echo "saved to $dest" >&2
}

ensure_kit() {
  local kit
  if kit="$(find_kit)"; then
    echo "$kit"
    return 0
  fi
  fetch_kit || return 1
  echo "$KIT_CACHE"
}

# ── What does this machine have? ──────────────────────
# Every binary has to come from one installation, so the first directory that
# has all of them wins. Covered: PATH, Postgres.app, Homebrew on both
# architectures, Debian and Ubuntu, Fedora and RHEL, and the BSDs.
find_pg_bin() {
  local candidates="" d
  if command -v pg_ctl >/dev/null 2>&1; then
    candidates="$(dirname "$(command -v pg_ctl)")"
  fi
  candidates="$candidates /Applications/Postgres.app/Contents/Versions/latest/bin"
  candidates="$candidates /opt/homebrew/opt/postgresql@17/bin /opt/homebrew/opt/postgresql@16/bin /opt/homebrew/opt/postgresql@15/bin"
  candidates="$candidates /usr/local/opt/postgresql@17/bin /usr/local/opt/postgresql@16/bin /usr/local/opt/postgresql@15/bin"
  candidates="$candidates /opt/homebrew/bin /usr/local/bin"
  # Newest distro PostgreSQL first.
  for d in $(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -rV); do
    candidates="$candidates $d"
  done
  for d in $(ls -d /usr/pgsql-*/bin 2>/dev/null | sort -rV); do
    candidates="$candidates $d"
  done
  candidates="$candidates /usr/bin /usr/local/bin"

  for d in $candidates; do
    if [[ -x "$d/pg_ctl" && -x "$d/initdb" && -x "$d/psql" && -x "$d/pg_isready" \
        && -x "$d/createdb" && -x "$d/dropdb" ]]; then
      echo "$d"
      return 0
    fi
  done
  return 1
}

have_docker() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

PG_BIN=""
MODE=""
detect() {
  if PG_BIN="$(find_pg_bin)"; then
    MODE="${SQL_PRACTICE_MODE:-local}"
  elif have_docker; then
    MODE="${SQL_PRACTICE_MODE:-docker}"
  else
    MODE=""
  fi
}

# ── Port ──────────────────────────────────────────────
# The port must not be re-guessed on every invocation: a running cluster holds
# the port it started on, so probing for a free one would pick a different port
# and every later command would talk to nothing. Order: what the running cluster
# says, then what we recorded when it was created, then a free port.
port_busy() {
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$1" >/dev/null 2>&1
  else
    (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1
  fi
}

port_from_running() {
  local pidfile="$DATA_DIR/postmaster.pid"
  [[ -f "$pidfile" ]] || return 1
  local line4
  line4="$(sed -n '4p' "$pidfile" 2>/dev/null)"
  [[ -n "$line4" ]] || return 1
  echo "$line4"
}

port_from_record() {
  # Scoped by mode: the local cluster and the container must not read each
  # other's port, or docker mode would report the port of a running local server.
  local f="$DATA_DIR/.sql-practice-port-${MODE:-local}"
  [[ -f "$f" ]] && cat "$f"
}

pick_port() {
  if [[ -n "${SQL_PRACTICE_PORT:-}" ]]; then
    echo "$SQL_PRACTICE_PORT"
    return 0
  fi
  local p
  for p in 55432 55433 55434 55435; do
    if ! port_busy "$p"; then
      echo "$p"
      return 0
    fi
  done
  echo "no free port among 55432, 55433, 55434, 55435. Set SQL_PRACTICE_PORT" >&2
  exit 1
}

resolve_port() {
  local recorded
  if [[ "$MODE" = "local" ]]; then
    # What the running cluster actually does outranks anything else, because
    # re-guessing the port is how every later command ends up talking to nothing.
    recorded="$(port_from_running)"
  fi
  if [[ -z "${recorded:-}" ]]; then
    recorded="$(port_from_record)"
  fi
  if [[ -n "${recorded:-}" ]]; then
    echo "$recorded"
    return 0
  fi
  pick_port
}

record_port() {
  mkdir -p "$DATA_DIR"
  echo "$1" > "$DATA_DIR/.sql-practice-port-${MODE:-local}"
}

# ── Local mode ────────────────────────────────────────
export PATH="$PG_BIN:$PATH"
PSQL_URI=""

conn_string() {
  echo "postgresql://postgres@127.0.0.1:$PORT/$DB"
}

local_running() {
  [[ -n "$PG_BIN" ]] && "$PG_BIN/pg_ctl" -D "$DATA_DIR" status >/dev/null 2>&1
}

local_start() {
  mkdir -p "$DATA_DIR"
  if [[ ! -f "$DATA_DIR/PG_VERSION" ]]; then
    "$PG_BIN/initdb" -D "$DATA_DIR" -U postgres -A trust >/dev/null
    echo "created cluster at $DATA_DIR"
  fi
  record_port "$PORT"
  if local_running; then
    return 0
  fi
  "$PG_BIN/pg_ctl" -D "$DATA_DIR" -l "$DATA_DIR/server.log" \
    -o "-p $PORT -k $SOCKET_DIR -c listen_addresses=127.0.0.1" start >/dev/null
  local i=0
  while [[ $i -lt 40 ]]; do
    if "$PG_BIN/pg_isready" -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1; then
      break
    fi
    sleep 0.3
    i=$((i + 1))
  done
  if "$PG_BIN/pg_isready" -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1; then
    echo "running on port $PORT"
  else
    echo "failed to start. Last lines of $DATA_DIR/server.log:" >&2
    tail -20 "$DATA_DIR/server.log" >&2
    exit 1
  fi
}

local_stop() {
  if local_running; then
    "$PG_BIN/pg_ctl" -D "$DATA_DIR" -m fast stop >/dev/null
    echo "stopped"
  else
    echo "not running"
  fi
}

psql_file() {
  "$PG_BIN/psql" -q -h 127.0.0.1 -p "$PORT" -U postgres -d "$1" -X -v ON_ERROR_STOP=1 -f "$2"
}

local_load() {
  local kit="$1"
  "$PG_BIN/dropdb" --if-exists -h 127.0.0.1 -p "$PORT" -U postgres "$DB"
  "$PG_BIN/createdb" -h 127.0.0.1 -p "$PORT" -U postgres "$DB"
  echo "loading schema..."
  psql_file "$DB" "$kit/schema.sql"
  echo "loading seed (about 9 seconds)..."
  psql_file "$DB" "$kit/seed.sql"
}

# ── Docker mode ───────────────────────────────────────
docker_running() {
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"
}

docker_start() {
  if docker_running; then
    return 0
  fi
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"; then
    docker start "$CONTAINER" >/dev/null
  else
    docker run --name "$CONTAINER" \
      -e POSTGRES_PASSWORD=drills \
      -p "127.0.0.1:$PORT:5432" \
      -d postgres:15 >/dev/null
  fi
  local i=0
  while [[ $i -lt 60 ]]; do
    if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
    i=$((i + 1))
  done
  record_port "$PORT"
  docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 || {
    echo "container started but PostgreSQL did not become ready" >&2
    exit 1
  }
  echo "running in docker container $CONTAINER on port $PORT"
}

docker_load() {
  local kit="$1"
  docker exec "$CONTAINER" psql -U postgres -q -c "drop database if exists $DB" >/dev/null
  docker exec "$CONTAINER" psql -U postgres -q -c "create database $DB" >/dev/null
  echo "loading schema..."
  docker exec -i "$CONTAINER" psql -U postgres -q -d "$DB" -X -v ON_ERROR_STOP=1 < "$kit/schema.sql" >/dev/null
  echo "loading seed (about 9 seconds)..."
  docker exec -i "$CONTAINER" psql -U postgres -q -d "$DB" -X -v ON_ERROR_STOP=1 < "$kit/seed.sql" >/dev/null
}

# ── Commands ──────────────────────────────────────────
# Print the leading comment block, from line 3 until the first line that is not
# a comment. A hardcoded line range works until someone edits the header, which
# is how the last two lines of the help went missing once already.
usage() {
  awk 'NR > 2 { if ($0 !~ /^#/) exit; sub(/^# ?/, ""); print }' "$0"
}

cmd_doctor() {
  echo "platform      : $(uname -s) $(uname -m)"
  echo "postgres bin  : ${PG_BIN:-not found}"
  if [[ -n "$PG_BIN" ]]; then
    echo "postgres ver  : $("$PG_BIN/psql" --version)"
  fi
  if command -v docker >/dev/null 2>&1; then
    if have_docker; then echo "docker        : available"; else echo "docker        : installed but the daemon is not running"; fi
  else
    echo "docker        : not installed"
  fi
  if [[ -n "$MODE" ]]; then
    echo "mode          : $MODE"
  else
    echo "mode          : none. Install PostgreSQL or start docker:"
    echo "                macOS   brew install postgresql@16   (or https://postgresapp.com)"
    echo "                Debian  sudo apt install postgresql"
    echo "                Fedora  sudo dnf install postgresql-server"
    echo "                docker  open Docker Desktop, or sudo systemctl start docker"
  fi
  if [[ -n "$MODE" ]]; then
    echo "port          : $PORT$( [[ -n "${SQL_PRACTICE_PORT:-}" ]] && echo ' (from SQL_PRACTICE_PORT)' || echo ' (first free)' )"
  fi
  echo "data dir      : $DATA_DIR"
  if find_kit >/dev/null; then
    echo "sql files     : $(find_kit)"
  else
    echo "sql files     : not found locally, would download from $KIT_URL"
  fi
}

cmd_up() {
  [[ -n "$MODE" ]] || { cmd_doctor; exit 1; }
  local kit
  kit="$(ensure_kit)"
  if [[ "$MODE" = "local" ]]; then
    local_start
    if "$PG_BIN/psql" -h 127.0.0.1 -p "$PORT" -U postgres -d "$DB" -X -tAc \
        "select count(*) from time_entry" >/dev/null 2>&1; then
      echo "database $DB already loaded. Use reset to reload the seed."
    else
      echo "database $DB missing, loading..."
      local_load "$kit"
    fi
  else
    docker_start
    if docker exec "$CONTAINER" psql -U postgres -d "$DB" -X -tAc "select count(*) from time_entry" >/dev/null 2>&1; then
      echo "database $DB already loaded. Use reset to reload the seed."
    else
      docker_load "$kit"
    fi
  fi
  cmd_status
}

cmd_reset() {
  [[ -n "$MODE" ]] || { cmd_doctor; exit 1; }
  local kit
  kit="$(ensure_kit)"
  if [[ "$MODE" = "local" ]]; then
    local_start
    local_load "$kit"
  else
    docker_start
    docker_load "$kit"
  fi
  cmd_status
}

cmd_seed() {
  [[ -n "$MODE" ]] || { cmd_doctor; exit 1; }
  local kit
  kit="$(ensure_kit)"
  if [[ "$MODE" = "local" ]]; then
    psql_file "$DB" "$kit/seed.sql"
  else
    docker exec -i "$CONTAINER" psql -U postgres -q -d "$DB" -X -v ON_ERROR_STOP=1 < "$kit/seed.sql" >/dev/null
  fi
  echo "seed reloaded"
}

cmd_status() {
  [[ -n "$MODE" ]] || { cmd_doctor; exit 1; }
  if [[ "$MODE" = "local" ]]; then
    if ! local_running; then
      echo "not running. Run: $0 up"
      return 1
    fi
  else
    docker_running || { echo "container $CONTAINER is not running. Run: $0 up"; return 1; }
  fi
  echo "connection: $(conn_string)"
  if [[ "$MODE" = "local" ]]; then
    "$PG_BIN/psql" "$(conn_string)" -X -c \
      "select (select count(*) from workspace) as workspaces,
              (select count(*) from app_user)  as people,
              (select count(*) from project)   as projects,
              (select count(*) from time_entry) as entries" 2>/dev/null \
      || echo "connected, but the schema is not loaded yet. Run: $0 reset"
  else
    docker exec "$CONTAINER" psql -U postgres -d "$DB" -X -c \
      "select (select count(*) from workspace) as workspaces,
              (select count(*) from app_user)  as people,
              (select count(*) from project)   as projects,
              (select count(*) from time_entry) as entries" 2>/dev/null \
      || echo "connected, but the schema is not loaded yet. Run: $0 reset"
  fi
}

cmd_psql() {
  [[ -n "$MODE" ]] || { cmd_doctor; exit 1; }
  cmd_up >/dev/null
  if [[ "$MODE" = "local" ]]; then
    "$PG_BIN/psql" "$(conn_string)" -X "$@"
  else
    docker exec -it "$CONTAINER" psql -U postgres -d "$DB" -X "$@"
  fi
}

cmd_query() {
  local sql="${1:?usage: $0 query \"select 1\"}"
  [[ -n "$MODE" ]] || { cmd_doctor; exit 1; }
  cmd_up >/dev/null
  if [[ "$MODE" = "local" ]]; then
    "$PG_BIN/psql" "$(conn_string)" -X -c "$sql"
  else
    docker exec "$CONTAINER" psql -U postgres -d "$DB" -X -c "$sql"
  fi
}

cmd_stop() {
  if [[ "$MODE" = "docker" ]]; then
    docker_running && docker stop "$CONTAINER" >/dev/null && echo "stopped" || echo "not running"
  else
    local_stop
  fi
}

cmd_destroy() {
  if [[ "$MODE" = "docker" ]]; then
    docker_running && docker stop "$CONTAINER" >/dev/null
    docker rm "$CONTAINER" >/dev/null 2>&1 && echo "container removed" || echo "no container to remove"
  else
    local_stop
    rm -rf "$DATA_DIR"
    echo "removed $DATA_DIR"
  fi
}

# ── Main ──────────────────────────────────────────────
detect
PORT="$(resolve_port)"

case "${1:-help}" in
  doctor)  cmd_doctor ;;
  up)      cmd_up ;;
  reset)   cmd_reset ;;
  seed)    cmd_seed ;;
  status)  cmd_status ;;
  conn)    echo "$(conn_string)" ;;
  psql)    shift; cmd_psql "$@" ;;
  query)   shift; cmd_query "$@" ;;
  stop)    cmd_stop ;;
  destroy) cmd_destroy ;;
  help|-h|--help) usage ;;
  *) echo "unknown command: $1" >&2; usage; exit 1 ;;
esac
