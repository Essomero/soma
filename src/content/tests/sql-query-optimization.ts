import type { TestContent } from "@/types";

export const sqlQueryOptimizationTest: TestContent = {
  slug: "sql-query-optimization",
  title: "SQL Query Planning, Indexing & Isolation",
  description:
    "Test your ability to read execution plans, optimize composite indexes, and prevent race conditions and lost updates under high concurrency.",
  category: "Databases",
  subcategory: "PostgreSQL // Query Performance",
  image: "https://images.unsplash.com/photo-1511721285502-9f81e79be874?w=1200&h=675&fit=crop",
  imageAlt: "Row of wooden card catalog drawers with brass handles",
  author: {
    name: "Soma Editorial",
    handle: "@soma",
  },
  date: "September 2026",
  tags: ["PostgreSQL", "SQL", "Indexes", "Query Optimization", "Concurrency"],
  topics: ["technology"],
  storySlug: "fs-1-why-this-type-error",
  estimatedMinutes: 8,
  defaultTimeLimitSeconds: 60,
  passingScore: 80,
  sources: [
    {
      type: "story",
      storySlug: "fs-1-why-this-type-error",
      title: "Why Does This Type Error?",
      description: "How to interpret shape mismatches and structural boundaries",
    },
    {
      type: "markdown",
      title: "Index Scan vs Bitmap Heap Scan Mechanics",
      description: "When the planner switches from btree traversal to bitmap pages",
      content: `### Index Scan vs Bitmap Heap Scan

When a query filters with a WHERE clause:
1. **Index Scan:** The planner traverses the B-Tree leaf pages in order and fetches each matching heap page immediately from disk. This is efficient when only a tiny fraction of rows match (high selectivity).
2. **Bitmap Index Scan + Bitmap Heap Scan:** When hundreds or thousands of rows match, an Index Scan would jump back and forth across disk blocks randomly. Instead, Postgres builds an in-memory bitmap of matching physical page numbers, sorts the page numbers physically, and then reads each table block in sequential physical order.
3. **Sequential Scan:** When matching rows exceed a threshold (typically 10-20% of the table), scanning every block sequentially is faster than touching the index at all.

### Concurrency and Lost Updates

Under the default \`READ COMMITTED\` isolation level, each statement sees a snapshot of committed data at the start of that statement, not the start of the transaction.

If Transaction A and Transaction B both read balance $100 and write back $100 - $20, the second write silently overwrites the first. To prevent this without moving to serializable isolation, use pessimistic row locks:
\`\`\`sql
SELECT balance FROM accounts WHERE id = 42 FOR UPDATE;
\`\`\``,
    },
    {
      type: "link",
      title: "PostgreSQL Documentation: Using EXPLAIN",
      url: "https://www.postgresql.org/docs/current/using-explain.html",
      description: "Official reference on Postgres query planning and scan types",
    },
  ],

  questions: [
    {
      id: "q1",
      type: "multiple-choice",
      question:
        "You run EXPLAIN on a query filtering on a column that has a valid B-Tree index, but Postgres chooses a Sequential Scan instead of using the index. What is the most common reason?",
      timeLimitSeconds: 30,
      options: [
        {
          id: "a",
          label:
            "The query matches a large percentage of rows (e.g. 30%), making random index reads slower than sequential block scans.",
        },
        {
          id: "b",
          label: "B-Tree indexes cannot be used when the WHERE clause has more than one condition.",
        },
        {
          id: "c",
          label: "Postgres only uses indexes on primary key columns.",
        },
        {
          id: "d",
          label: "The autovacuum daemon is actively compressing the index leaf pages.",
        },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Indexes involve non-sequential disk access. When a query returns a large fraction of the table, reading table blocks sequentially in disk order is faster than fetching each row via index pointers.",
    },
    {
      id: "q2",
      type: "open",
      question:
        "Explain what a Bitmap Heap Scan is in Postgres, and why the planner chooses it over a regular Index Scan when retrieving several thousand matching rows.",
      timeLimitSeconds: 90,
      placeholder:
        "Describe the two-phase scan: bitmap creation from the index, sorting page numbers, and reading table blocks...",
      rubric:
        "The candidate must explain: (1) An Index Scan visits table pages in random leaf order, causing random I/O if many rows match across different blocks. (2) A Bitmap Index Scan first marks which table blocks contain matching rows in an in-memory bitmap. (3) The Bitmap Heap Scan then visits those table blocks in physical disk order, converting random I/O into sequential I/O and visiting each disk page only once.",
      keyPoints: [
        "Two-phase scan",
        "Bitmap of page offsets",
        "Sorting by physical disk order",
        "Converting random I/O to sequential access",
      ],
      sampleAnswer:
        "A regular Index Scan reads index entries and immediately fetches the corresponding table tuple from disk. When thousands of rows match, this causes repeated, random disk jumps across the same pages. A Bitmap Index Scan solves this by first scanning the index to build an in-memory bitmap of matching physical page numbers. The Bitmap Heap Scan then reads the actual table blocks in sequential physical order, ensuring each disk block is loaded at most once and turning scattered random I/O into ordered reads.",
    },
    {
      id: "q3",
      type: "multiple-choice",
      question:
        "You have a table of 10 million events. A frequent query runs: SELECT * FROM events WHERE tenant_id = 42 AND created_at >= '2026-01-01' ORDER BY created_at DESC LIMIT 20. Which composite index is optimal?",
      timeLimitSeconds: 45,
      options: [
        { id: "a", label: "CREATE INDEX ON events (created_at, tenant_id);" },
        { id: "b", label: "CREATE INDEX ON events (tenant_id, created_at DESC);" },
        { id: "c", label: "CREATE INDEX ON events (created_at);" },
        { id: "d", label: "Two separate single-column indexes on tenant_id and created_at." },
      ],
      allowMultiple: false,
      correctOptionIds: ["b"],
      explanation:
        "Equality columns must precede range/order columns in composite indexes. Indexing (tenant_id, created_at DESC) allows the engine to jump directly to tenant 42 and immediately read the newest 20 rows in sorted order without filtering or sorting in memory.",
    },
    {
      id: "q4",
      type: "open",
      question:
        "Two concurrent web requests attempt to purchase the last available seat on a flight. Under Postgres READ COMMITTED isolation, both run: 'SELECT seats_left FROM flights WHERE id = 101'. Both see seats_left = 1, and both run 'UPDATE flights SET seats_left = 0 WHERE id = 101'. Explain how to prevent this race condition.",
      timeLimitSeconds: 90,
      placeholder:
        "Explain how SELECT ... FOR UPDATE or an atomic conditional UPDATE prevents the double booking...",
      rubric:
        "The candidate must provide at least one correct solution: (1) Pessimistic locking with SELECT ... FOR UPDATE inside a transaction, which locks the flight row until commit, forcing the second transaction to wait and re-read seats_left = 0. OR (2) An atomic conditional update: UPDATE flights SET seats_left = seats_left - 1 WHERE id = 101 AND seats_left > 0, and checking if rows_affected == 1.",
      keyPoints: [
        "Pessimistic locking with FOR UPDATE",
        "Row lock acquisition",
        "Atomic conditional UPDATE with WHERE seats_left > 0",
        "Checking affected row count",
      ],
      sampleAnswer:
        "To prevent double booking under READ COMMITTED, use pessimistic row-level locking or an atomic conditional update. With pessimistic locking: run 'SELECT seats_left FROM flights WHERE id = 101 FOR UPDATE' inside a transaction. The first request acquires an exclusive lock on row 101; the second request blocks until the first transaction commits, at which point it sees seats_left = 0 and rejects the purchase. Alternatively, run an atomic update: 'UPDATE flights SET seats_left = seats_left - 1 WHERE id = 101 AND seats_left > 0' and verify that exactly 1 row was updated.",
    },
    {
      id: "q5",
      type: "multiple-choice",
      question:
        "A database table has 5 million rows, but only 2,000 rows have status = 'pending'. Which index strategy uses the least disk space while delivering instant lookups for pending jobs?",
      timeLimitSeconds: 30,
      options: [
        {
          id: "a",
          label: "A full B-Tree index on (status).",
        },
        {
          id: "b",
          label: "A partial index: CREATE INDEX ON jobs (id) WHERE status = 'pending';",
        },
        {
          id: "c",
          label: "A hash index on (status, id).",
        },
        {
          id: "d",
          label: "A GIN index on status with JSONB operators.",
        },
      ],
      allowMultiple: false,
      correctOptionIds: ["b"],
      explanation:
        "A partial index only includes rows matching the WHERE condition (the 2,000 pending rows). It takes up virtually zero disk space and cache memory compared to indexing all 5 million rows.",
    },
  ],
};
