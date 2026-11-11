// One-time migration: clear false "explain" labels from legacy AI comments
// that were backfilled by the DEFAULT 'explain' before mode was tracked.
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;
if (!url || !token) {
  console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url, authToken: token });

try {
  const before = await client.execute("SELECT COUNT(*) AS n FROM comments WHERE is_ai = 1 AND mode = 'explain'");
  console.log("Legacy AI comments with mode='explain':", before.rows[0].n);

  await client.execute("UPDATE comments SET mode = NULL WHERE is_ai = 1 AND mode = 'explain'");
  console.log("Migration complete");

  const after = await client.execute("SELECT COUNT(*) AS n FROM comments WHERE is_ai = 1 AND mode = 'explain'");
  console.log("Remaining legacy rows:", after.rows[0].n);
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exit(1);
}
client.close();
