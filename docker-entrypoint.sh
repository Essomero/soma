#!/bin/sh
set -e

# Fix volume permissions — Railway/Fly/Render mount /app/data as root
# Running as root inside container is fine (isolation via container boundary)
# This fixes: Error: ConnectionFailed("Unable to open connection to local database /app/data/soma.db: 14")
for p in /app/data /data; do
  if [ -d "$p" ]; then
    echo "[entrypoint] Fixing $p permissions (was $(ls -ld $p | awk '{print $3":"$4" "$1}'))..."
    # Make writable for everyone, and try chown to node if possible
    chmod -R 777 "$p" 2>/dev/null || chmod -R 775 "$p" 2>/dev/null || true
    chown -R node:node "$p" 2>/dev/null || true
  else
    mkdir -p "$p" 2>/dev/null || true
    chmod 777 "$p" 2>/dev/null || true
  fi
done

DB_FILE="${SQLITE_PATH:-/app/data/soma.db}"
DB_FILE_PATH=$(echo "$DB_FILE" | sed 's/^file://' | cut -d'?' -f1)

if [ "${USE_TURSO:-false}" = "false" ] || [ "${USE_TURSO:-false}" = "0" ] || [ "${USE_TURSO:-false}" = "no" ] || [ "${USE_TURSO:-false}" = "off" ]; then
  if [ ! -f "$DB_FILE_PATH" ] || [ ! -s "$DB_FILE_PATH" ]; then
    echo "[entrypoint] Seeding $DB_FILE_PATH (first boot)..."
    npx tsx ./scripts/init-docker.ts 2>&1 | tail -n 20 || echo "[entrypoint] init-docker seed failed, will still start server (will seed on demand via API)"
  else
    echo "[entrypoint] DB exists at $DB_FILE_PATH ($(du -h "$DB_FILE_PATH" 2>/dev/null | cut -f1 || echo "?"))"
    # Ensure existing DB can be opened
    chmod 666 "$DB_FILE_PATH" 2>/dev/null || true
    # If 0 published, publish for demo visibility
    npx tsx -e "
import {createClient} from '@libsql/client';
const c=createClient({url: 'file:${DB_FILE_PATH}'});
try {
  const r=await c.execute('SELECT COUNT(*) as n FROM content_items WHERE status=\"published\"');
  const n=r.rows?.[0]?.n||0;
  if(n===0){
    await c.execute({sql:'UPDATE content_items SET status=?', args:['published']});
    console.log('[entrypoint] published existing rows');
  } else {
    console.log('[entrypoint] already published', n);
  }
} catch(e){
  console.log('[entrypoint] publish check failed', e.message);
}
" 2>&1 | tail -n 5 || true
  fi
else
  echo "[entrypoint] USE_TURSO=${USE_TURSO} -> skipping file SQLite auto-seed"
fi

# Run as root (fixes Railway volume) — container isolation provides security boundary
# Platform mounts: Compose soma_data:/app/data, Fly [[mounts]] /data, Render Disks /app/data, Railway Add Volume /app/data
exec "$@"
