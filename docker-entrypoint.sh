#!/bin/sh
set -e

# Auto-seed file SQLite via volume at /app/data/soma.db if empty
# Uses USE_TURSO=false (default in Dockerfile) -> local file, not sqld/Turso
# Only runs when Turso not configured and DB file is new/empty

DB_FILE="${SQLITE_PATH:-/app/data/soma.db}"
DB_FILE_PATH=$(echo "$DB_FILE" | sed 's/^file://' | cut -d'?' -f1)

# Check if we should seed: USE_TURSO=false and DB file missing or empty
if [ "${USE_TURSO:-false}" = "false" ] || [ "${USE_TURSO:-false}" = "0" ] || [ "${USE_TURSO:-false}" = "no" ] || [ "${USE_TURSO:-false}" = "off" ]; then
  if [ ! -f "$DB_FILE_PATH" ] || [ ! -s "$DB_FILE_PATH" ]; then
    echo "[entrypoint] Seeding $DB_FILE_PATH (first boot)..."
    if [ -f "./scripts/init-docker.ts" ]; then
      npx tsx ./scripts/init-docker.ts || echo "[entrypoint] init-docker seed failed, will still start server"
    else
      echo "[entrypoint] No init-docker.ts, skipping seed"
    fi
  else
    # If DB exists but has 0 published rows, publish them for demo visibility
    echo "[entrypoint] DB exists at $DB_FILE_PATH ($(du -h "$DB_FILE_PATH" | cut -f1)), ensuring published"
    npx tsx -e "
import {createClient} from '@libsql/client';
const c=createClient({url: 'file:${DB_FILE_PATH}'});
const r=await c.execute('SELECT COUNT(*) as n FROM content_items WHERE status=\"published\"').catch(()=>({rows:[{n:0}]}));
const arr=r.rows||[];
const n=arr[0]?.n||0;
if(n===0){
  await c.execute({sql:'UPDATE content_items SET status=?', args:['published']}).catch(()=>{});
  console.log('[entrypoint] published existing rows');
} else {
  console.log('[entrypoint] already published', n);
}
" 2>&1 | tail -n 5 || true
  fi
else
  echo "[entrypoint] USE_TURSO=${USE_TURSO} -> skipping file SQLite auto-seed (using ${TURSO_DATABASE_URL:-sqld or Turso})"
fi

exec "$@"
