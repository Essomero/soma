// One-time setup: create the public_pages table in Turso DB.
// Run: node scripts/setup-public-pages.js
//
// Requires TURSO_DB and TURSO_TOKEN env vars (same as api/*.js).

const DB_URL = (process.env.TURSO_DB || "").replace("libsql://", "https://");
const TOKEN = process.env.TURSO_TOKEN || "";

if (!DB_URL || !TOKEN) {
  console.error("Set TURSO_DB and TURSO_TOKEN environment variables.");
  process.exit(1);
}

async function main() {
  const body = {
    requests: [{
      type: "execute",
      stmt: {
        sql: `CREATE TABLE IF NOT EXISTS public_pages (
          slug TEXT PRIMARY KEY,
          public INTEGER NOT NULL DEFAULT 0,
          set_at TEXT
        )`,
      },
    }],
  };

  const r = await fetch(DB_URL + "/v2/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await r.json();
  if (r.ok) {
    console.log("public_pages table ready.");
  } else {
    console.error("Failed:", JSON.stringify(data).slice(0, 500));
  }
}

main();
