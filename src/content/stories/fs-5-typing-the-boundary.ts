export const fs5TypingTheBoundary = {
  slug: "fs-5-typing-the-boundary",
  category: "Engineering",
  subcategory: "Full-Stack Prep // TypeScript",
  title: "Typing the Boundary: unknown vs any, and Why You Parse Instead of Cast",
  excerpt:
    "Inside your program, TypeScript checks every line. But at the boundary where data enters from the outside (a fetch call, localStorage, or user input), TypeScript goes blind. This lesson shows why 'any' causes production crashes, why 'as' is just a fake passport, and how to use schemas to safely parse data at the front door.",
  image: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200&h=675&fit=crop",
  imageAlt: "Sunlight through an open doorway representing the boundary where untrusted data enters",
  author: { name: "Soma Editorial" },
  date: "2026-08-16",
  added: "2026-08-16T00:00:00+03:00",
  tags: ["Full-Stack Prep", "TypeScript"],
  topics: ["technology", "career"],
  archived: false,
  listed: false,

  intro: "*Inside your codebase, TypeScript feels like an impenetrable shield. Every variable has a known shape, and every function call is verified. But then your app calls fetch() to load data from an API. The internet does not know TypeScript. The bytes that arrive over the wire could be anything: a user, a 404 error, or corrupt JSON. If you write 'as User', you are holding a fake passport. This lesson is about what happens at the border, and how to parse data safely once so your app never crashes.*",

  body: [
    "Most production bugs in TypeScript don't happen in the middle of your code; they happen at the boundaries. They happen where data enters your system from an external source: network requests, localStorage, URL query parameters, or form submissions. At the boundary, the compiler has no information about what actually arrived. How you handle that moment determines whether your type safety is real or an illusion.",
  ],

  bentoHighlights: [
    {
      label: "THE BORDER CHECK",
      title: "any is Blindness, unknown is Caution",
      description: "`any` tells TypeScript to look away and stop checking. `unknown` tells TypeScript: 'I don't know what arrived yet; stop me from touching it until I verify it.'",
    },
    {
      label: "THE ILLUSION",
      title: "Casting is a Fake Passport",
      description: "Writing `data as User` doesn't validate a single byte at runtime. If the API returned an error message instead of a user, your app will still crash in production.",
    },
    {
      label: "THE SOLUTION",
      title: "Parse at the Door with Schemas",
      description: "Instead of casting, pass untrusted data through a validator like Zod. It verifies the shape at runtime, throws clean errors on bad data, and produces a trusted type.",
    },
  ],

  sections: [
    {
      heading: "5.1 Recap of Lesson 4: Deriving Types",
      paragraphs: [
        "In Lesson 4, we saw how to compute new shapes from existing ones using mapped types like `Pick` and `Partial`.",
        "Now we arrive at the edge of the world. Everything we have studied so far happens inside your compiler. But what happens when real data arrives from the outside world? That is the trust boundary.",
      ],
    },
    {
      heading: "5.2 The Edge of the Map: Where TypeScript Goes Blind",
      paragraphs: [
        "Imagine you write this common frontend code:\n\n```typescript\nasync function loadUser(id: string) {\n  const res = await fetch(`/api/users/${id}`);\n  const user = (await res.json()) as User;\n  return user;\n}\n```",
        "It compiles with zero errors. It looks safe. But look at what actually happens at runtime.",
        "What if the user was deleted, and the server returned a 404 with `{ message: 'Not found' }`? Your code blindly casts it to `User`. Later, another component tries to read `user.name.toUpperCase()`, and production crashes with `Cannot read properties of undefined`.",
        "TypeScript didn't catch the bug because you told it a lie. You wrote `as User`. A type assertion is like flashing a fake passport at border control: it might fool the guard, but it doesn't change who you actually are. TypeScript's types are erased when your code runs; they cannot protect you from real bytes crossing the network.",
      ],
    },
    {
      heading: "5.3 any vs unknown: Blindfold vs Caution",
      paragraphs: [
        "When data enters from the outside, you have two choices for how to describe it:",
        "**1. `any` (The Blindfold):**\nIf you mark a value as `any`, TypeScript completely turns off. You can read properties that don't exist, call it like a function, or pass it anywhere. Worse, `any` is contagious: every variable that touches it loses its type safety too.",
        "**2. `unknown` (The Locked Box):**\nIf you mark a value as `unknown`, TypeScript says: 'Something is in this box, but I have no idea what it is. I refuse to let you read `.name` or `.id` until you prove to me what is inside.'",
        "```typescript\nlet data: unknown = JSON.parse(rawString);\n\n// Error: Object is of type 'unknown'!\nconsole.log(data.name);\n\n// Safe: You proved it is a valid object with a name\nif (typeof data === \"object\" && data !== null && \"name\" in data) {\n  console.log((data as { name: string }).name);\n}\n```",
        "`unknown` is the honest type. It admits you don't know what arrived, and forces you to check before you touch.",
      ],
    },
    {
      heading: "5.4 Parse, Don't Validate: Border Inspection",
      paragraphs: [
        "How do you inspect unknown data cleanly without writing fifty lines of manual `typeof` checks? There is a famous programming principle: **Parse, don't validate.**",
        "**Validation** checks data and returns a simple boolean: 'Yes, this looks like a user.' But it throws the proof away, leaving you to manually cast the value afterwards.",
        "**Parsing** is different. It takes unknown data, inspects every field at runtime, and either rejects the bad data with a clear error or outputs a brand-new, guaranteed object with the exact shape you need.",
        {
          type: "lab" as const,
          id: "lab-fs5-parse-boundary",
          title: "The Schema at the Door",
          path: "fullstack/05-typing-the-boundary",
          step: { current: 1, total: 2, title: "The Schema at the Door" },
          summary:
            "Test untrusted payloads through the two doors across 4 independent probes: valid payload (npm run lab:probe-1), missing required field causing runtime crash vs schema catch (npm run lab:probe-2), corrupt field type (npm run lab:probe-3), and API drift detection (npm run lab:probe-4). Run all 4 together with npm run lab:boundary or step through interactively with npm run lab:step.",
          command: "npm run lab:boundary",
          output:
            "================================================================================\n  [Probe 1/4] Trust Boundary: Valid Untrusted Payload\n================================================================================\n\nCode Under Test (src/schema.ts & src/boundary.ts):\n  const userSchema = object({ id: string(), name: string(), email: string(), role: enumeration([\"admin\", \"member\"]) });\n  function safeParse(schema: Schema<T>, value: unknown): SafeParseResult<T>;\n\nRaw Input:\n  '{\"id\":\"u-101\",\"name\":\"Ada Lovelace\",\"email\":\"ada@analytical.engine\",\"role\":\"admin\"}'\n\nDoor A: Naive Cast (as User)\n  TypeScript Checker: SILENT (bypassed by cast)\n  Runtime Result:     { id: 'u-101', name: 'Ada Lovelace', email: 'ada@analytical.engine', role: 'admin' }\n  Safety Status:      PASSED (only because incoming data happened to match)\n\nDoor B: Schema Parse (safeParse)\n  Validation Engine:  CHECKING\n    - id: ok\n    - name: ok\n    - email: ok\n    - role: ok\n  Parse Verdict:      SUCCESS\n  Output:             Typed User object guaranteed by runtime contract",
          files: [
            {
              path: "src/schema.ts",
              action: "inspect",
              language: "typescript",
              code: "/**\n * A miniature zod.\n *\n * One schema describes a shape twice: as the runtime check and as the type the\n * check guarantees. `parse` is the only door from untrusted data to trusted\n * data, `safeParse` is the non-throwing variant, and `describe` prints the type\n * the schema stands for: the runtime shadow of `z.infer<typeof schema>`.\n */\n\nexport class ParseError extends Error {\n  path: (string | number)[];\n  constructor(path: (string | number)[], message: string) {\n    const where = path.length > 0 ? path.join(\".\") : \"(root)\";\n    super(`${where}: ${message}`);\n    this.name = \"ParseError\";\n    this.path = path;\n  }\n}\n\nfunction fail(path: (string | number)[], message: string): never {\n  throw new ParseError(path, message);\n}\n\nconst isPlainObject = (value: unknown): value is Record<string, unknown> =>\n  value !== null && typeof value === \"object\" && !Array.isArray(value);\n\nexport interface Schema<T> {\n  kind: string;\n  parse(value: unknown, path?: (string | number)[]): T;\n  [key: string]: unknown;\n}\n\nexport const string = (): Schema<string> => ({\n  kind: \"string\",\n  parse(value, path = []) {\n    if (typeof value !== \"string\") fail(path, \"expected string\");\n    return value;\n  },\n});\n\nexport const number = (): Schema<number> => ({\n  kind: \"number\",\n  parse(value, path = []) {\n    if (typeof value !== \"number\" || Number.isNaN(value)) fail(path, \"expected number\");\n    return value;\n  },\n});\n\nexport const boolean = (): Schema<boolean> => ({\n  kind: \"boolean\",\n  parse(value, path = []) {\n    if (typeof value !== \"boolean\") fail(path, \"expected boolean\");\n    return value;\n  },\n});\n\nexport const literal = <T extends string | number | boolean>(expected: T): Schema<T> => ({\n  kind: \"literal\",\n  expected,\n  parse(value, path = []) {\n    if (value !== expected) fail(path, `expected ${JSON.stringify(expected)}`);\n    return value as T;\n  },\n});\n\nexport const enumeration = <T extends string>(allowed: T[]): Schema<T> & { allowed: T[] } => ({\n  kind: \"enum\",\n  allowed,\n  parse(value, path = []) {\n    if (typeof value !== \"string\" || !allowed.includes(value as T)) {\n      fail(path, `expected one of ${allowed.join(\", \")}`);\n    }\n    return value as T;\n  },\n});\n\nexport const array = <T>(item: Schema<T>): Schema<T[]> & { item: Schema<T> } => ({\n  kind: \"array\",\n  item,\n  parse(value, path = []) {\n    if (!Array.isArray(value)) fail(path, \"expected array\");\n    return value.map((entry, index) => item.parse(entry, [...path, index]));\n  },\n});\n\nexport const object = <S extends Record<string, Schema<unknown>>>(\n  shape: S,\n): Schema<{ [K in keyof S]: S[K] extends Schema<infer U> ? U : never }> & { shape: S } => ({\n  kind: \"object\",\n  shape,\n  parse(value, path = []) {\n    if (!isPlainObject(value)) fail(path, \"expected object\");\n    const parsed: Record<string, unknown> = {};\n    for (const [key, field] of Object.entries(shape)) {\n      parsed[key] = field.parse(value[key], [...path, key]);\n    }\n    return parsed as any;\n  },\n});\n\nexport const optional = <T>(inner: Schema<T>): Schema<T | undefined> & { inner: Schema<T> } => ({\n  kind: \"optional\",\n  inner,\n  parse(value, path = []) {\n    return value === undefined ? undefined : inner.parse(value, path);\n  },\n});\n\nexport const transform = <A, B>(\n  inner: Schema<A>,\n  coerce: (val: A) => B,\n  to: string,\n): Schema<B> & { inner: Schema<A>; to: string } => ({\n  kind: \"transform\",\n  inner,\n  to,\n  parse(value, path = []) {\n    return coerce(inner.parse(value, path));\n  },\n});\n\nexport function parse<T>(schema: Schema<T>, value: unknown): T {\n  return schema.parse(value, []);\n}\n\nexport type SafeParseResult<T> =\n  | { success: true; data: T }\n  | { success: false; error: { message: string; path: (string | number)[] } };\n\nexport function safeParse<T>(schema: Schema<T>, value: unknown): SafeParseResult<T> {\n  try {\n    return { success: true, data: parse(schema, value) };\n  } catch (error) {\n    if (error instanceof ParseError) {\n      return { success: false, error: { message: error.message, path: error.path } };\n    }\n    throw error;\n  }\n}\n\nexport function describe(schema: any): string {\n  switch (schema.kind) {\n    case \"string\":\n      return \"string\";\n    case \"number\":\n      return \"number\";\n    case \"boolean\":\n      return \"boolean\";\n    case \"literal\":\n      return JSON.stringify(schema.expected);\n    case \"enum\":\n      return schema.allowed.map((value: string) => JSON.stringify(value)).join(\" | \");\n    case \"array\":\n      return `${describe(schema.item)}[]`;\n    case \"optional\":\n      return `${describe(schema.inner)} | undefined`;\n    case \"transform\":\n      return schema.to;\n    case \"object\": {\n      const members = Object.entries(schema.shape).map(\n        ([key, field]) => `${key}: ${describe(field)}`,\n      );\n      return `{ ${members.join(\"; \")} }`;\n    }\n    default:\n      throw new Error(`unknown schema kind: ${schema.kind}`);\n  }\n}\n\nexport const userSchema = object({\n  id: string(),\n  name: string(),\n  email: string(),\n  role: enumeration([\"admin\", \"member\"]),\n});",
              description: "One schema, two jobs: the runtime check and the type it derives",
            },
            {
              path: "src/boundary.ts",
              action: "inspect",
              language: "typescript",
              code: "/**\n * The two doors untrusted data comes through: a JSON text and an already-parsed\n * value. Neither door returns `any`: both hand back a result the caller has to\n * check, because the type system cannot see what is behind the door.\n */\n\nimport { ParseError, parse, type Schema } from \"./schema.ts\";\n\nexport type ReadJsonResult =\n  | { ok: true; value: unknown }\n  | { ok: false; message: string };\n\nexport function readJson(text: string): ReadJsonResult {\n  try {\n    return { ok: true, value: JSON.parse(text) };\n  } catch (error: any) {\n    return { ok: false, message: error.message };\n  }\n}\n\nexport type DecodeResult<T> =\n  | { ok: true; data: T }\n  | { ok: false; message: string; path: (string | number)[] };\n\nexport function decode<T>(schema: Schema<T>, input: unknown): DecodeResult<T> {\n  try {\n    return { ok: true, data: parse(schema, input) };\n  } catch (error) {\n    if (error instanceof ParseError) {\n      return { ok: false, message: error.message, path: error.path };\n    }\n    throw error;\n  }\n}",
              description: "JSON.parse returns unknown; decode turns it into a guaranteed value or a named failure",
            },
          ],
        },
      ],
    },
    {
      heading: "5.5 Schemas as the Single Source of Truth: Zod",
      paragraphs: [
        "In modern TypeScript, we use schema libraries like **Zod** to guard the border. Look at how clean this is:\n\n```typescript\nimport { z } from \"zod\";\n\n// 1. Define the runtime schema\nexport const UserSchema = z.object({\n  id: z.string(),\n  name: z.string(),\n  email: z.string().email(),\n  role: z.enum([\"admin\", \"member\"]),\n});\n\n// 2. Derive the TypeScript type from the schema automatically\nexport type User = z.infer<typeof UserSchema>;\n```",
        "Look at what this solves: you no longer maintain a separate TypeScript `interface User` and a separate validation function. The schema is the **single source of truth**.",
        "Now look at how you handle API responses:\n\n```typescript\nasync function loadUser(id: string): Promise<User> {\n  const res = await fetch(`/api/users/${id}`);\n  const json = await res.json();\n\n  // Parse at the boundary!\n  return UserSchema.parse(json);\n}\n```",
        "If the API returns valid data, you get a fully-typed `User`. If the API returns a 404 message or missing fields, Zod throws a descriptive error immediately at the boundary. The bad data never enters your application. The rest of your app can relax and trust its types completely.",
      ],
    },
    {
      heading: "What You Just Learned",
      paragraphs: [
        "Here is what to remember from this lesson:\n\n- TypeScript types are erased at runtime; they cannot verify data arriving over the network.\n- Casting with `as` is a fake passport that invites runtime crashes when APIs change.\n- `any` turns off compiler checks; `unknown` is the honest type for untrusted data.\n- Parse at the door instead of validating after the fact.\n- Use schemas like Zod so your runtime checks and compile-time types never drift apart.",
      ],
    },
    {
      heading: "Practice Problems",
      paragraphs: [
        "**P1: The Boundary Audit.** You have a function that loads user profiles from a remote service. Why does `(await res.json()) as Profile` leave your app vulnerable to crashes, and how does checking `res.ok` and parsing with a schema fix it?",
        {
          type: "lab" as const,
          id: "lab-p1-typing-the-boundary",
          title: "The Boundary Audit",
          path: "fullstack/05-typing-the-boundary",
          step: { current: 1, total: 3, title: "Practice Problem 1" },
          summary:
            "fetchProfile never checks res.ok and never parses the body, so a 404 error envelope is returned as a profile and a body missing email reaches the account screen untyped.",
          command: "npm run test:p1",
          output:
            "✔ Problem 1: a 200 with a valid body yields the profile\n" +
            "✖ Problem 1: an error response is rejected with the API's message\n" +
            "  AssertionError [ERR_ASSERTION]: Expected error response to throw \"User not found\", but got {\"error\":\"User not found\"}.\n" +
            "✖ Problem 1: a response missing email is rejected with the missing field named\n" +
            "  AssertionError [ERR_ASSERTION]: Expected schema failure naming \"email\", but got {\"id\":\"u-101\",\"name\":\"Ada\"}.\n" +
            "\n" +
            "ℹ tests 3\n" +
            "ℹ pass 1\n" +
            "ℹ fail 2",
          files: [
            {
              path: "src/p1_boundary_audit.ts",
              action: "modify" as const,
              language: "typescript",
              code: "/**\n * Load the user profile the account screen renders.\n *\n * `client` is the thin fetch wrapper the app uses everywhere: `get(path)`\n * resolves to the response, and `json()` resolves to the body.\n */\n\nexport interface HttpClient {\n  get(path: string): Promise<{ ok: boolean; json(): Promise<unknown> }>;\n}\n\nexport async function fetchProfile(client: HttpClient, id: string): Promise<unknown> {\n  const response = await client.get(`/api/users/${id}`);\n  const data = await response.json();\n  return data;\n}",
              description: "Trusts the response: no status check and no parse",
            },
          ],
        },
        "*Hint:* Check `if (!res.ok)` to handle HTTP errors, then run `safeParse(schema, res.body)`.",
        "*Solution & Fix:* If the server returns a 404 or 500, `res.ok` is false and the body is an error envelope, not a profile. Casting with `as Profile` allows that error envelope to enter your app. Check `if (!res.ok) throw new Error(res.body.error);` and then validate the payload with `safeParse(userSchema, res.body)` before returning it.",
        "**P2: unknown vs any.** Look at this table comparison:\n\n```typescript\nfunction processAny(x: any) {\n  x.trim(); // Compiles without error\n}\n\nfunction processUnknown(x: unknown) {\n  x.trim(); // Error: Object is of type 'unknown'\n}\n```\n\nWhy is `unknown` safe while `any` is a trap?",
        {
          type: "lab" as const,
          id: "lab-p2-typing-the-boundary",
          title: "unknown Is Not any",
          path: "fullstack/05-typing-the-boundary",
          step: { current: 2, total: 3, title: "Practice Problem 2" },
          summary:
            "The table treats both top types as assignable to everything, so unknown -> string is reported as legal (the exact assignment the checker refuses, and the reason unknown is the honest any).",
          command: "npm run test:p2",
          output:
            "✔ Problem 2: any flows out into any type\n" +
            "✖ Problem 2: every type flows into any and into unknown\n" +
            "  AssertionError [ERR_ASSERTION]: Expected any and unknown to accept every type, but got {\"any\":true,\"unknown\":false}.\n" +
            "✖ Problem 2: unknown refuses assignment to specific types without narrowing\n" +
            "  AssertionError [ERR_ASSERTION]: Expected unknown -> string to be refused, but got legal: true.\n" +
            "\n" +
            "ℹ tests 3\n" +
            "ℹ pass 1\n" +
            "ℹ fail 2",
          files: [
            {
              path: "src/p2_assignability.ts",
              action: "modify" as const,
              language: "typescript",
              code: "/**\n * The assignability rules the checker applies at the boundary, spelled out as\n * data: `any` and `unknown` are the top types, so a value of either can be\n * passed anywhere.\n */\n\nconst TOP_TYPES = new Set([\"any\", \"unknown\"]);\n\nexport interface AssignableCheck {\n  assignable: boolean;\n  reason: string | null;\n}\n\nexport function checkAssignable(from: string, to: string): AssignableCheck {\n  if (TOP_TYPES.has(from)) return { assignable: true, reason: null };\n  if (from === to) return { assignable: true, reason: null };\n  return { assignable: false, reason: `${from} is not assignable to ${to}` };\n}\n\nexport const TABLE: { from: string; to: string }[] = [\n  { from: \"any\", to: \"any\" },\n  { from: \"any\", to: \"unknown\" },\n  { from: \"unknown\", to: \"any\" },\n  { from: \"unknown\", to: \"string\" },\n  { from: \"string\", to: \"unknown\" },\n];\n\nexport function assignabilityTable() {\n  return TABLE.map((cell) => ({ ...cell, ...checkAssignable(cell.from, cell.to) }));\n}",
              description: "Both top types are treated as flowing out into every type",
            },
          ],
        },
        "*Hint:* `any` lets you call `.trim()` on a number, causing a runtime crash. `unknown` forces an `if (typeof x === 'string')` check first.",
        "*Solution & Fix:* `any` turns off all compiler checks, allowing invalid operations to reach production. `unknown` blocks all property access and method calls until you perform runtime narrowing, guaranteeing that the operation is safe before it runs.",
        "**P3: The Drift Gate.** What happens when your backend team adds a new field `tier` to an API response, but your frontend still uses a hand-written interface? How does schema inference solve API drift?",
        {
          type: "lab" as const,
          id: "lab-p3-typing-the-boundary",
          title: "The Drift Gate",
          path: "fullstack/05-typing-the-boundary",
          step: { current: 3, total: 3, title: "Practice Problem 3" },
          summary:
            "The gate compares in the wrong direction: it reports client fields the contract never declared, so a field the contract just added sails through the CI check and the client model keeps its stale shape.",
          command: "npm run test:p3",
          output:
            "✔ Problem 3: the contract exposes every field the schema declares\n" +
            "✔ Problem 3: a client model that has kept up with the contract is in sync\n" +
            "✖ Problem 3: a client model missing a contract field fails the drift gate\n" +
            "  AssertionError [ERR_ASSERTION]: Expected missing field 'tier' to fail the drift gate, but got {\"ok\":true,\"missing\":[]}.\n" +
            "\n" +
            "ℹ tests 3\n" +
            "ℹ pass 2\n" +
            "ℹ fail 1",
          files: [
            {
              path: "src/p3_drift_gate.ts",
              action: "modify" as const,
              language: "typescript",
              code: "/**\n * CI gate for the shared contract. `userSchema` is the contract; the client's\n * hand-written model lists the fields it still knows about. The gate reports\n * the fields the client model is missing, so drift is caught by the pipeline\n * instead of by a production crash.\n */\n\nimport { userSchema } from \"./schema.ts\";\n\nexport function contractFields(): string[] {\n  return Object.keys(userSchema.shape);\n}\n\nexport interface DriftResult {\n  inSync: boolean;\n  missing: string[];\n}\n\nexport function drift(clientFields: string[]): DriftResult {\n  const contract = contractFields();\n  const missing = clientFields.filter((field) => !contract.includes(field));\n  return { inSync: missing.length === 0, missing };\n}",
              description: "The diff runs the contract-to-client comparison backwards",
            },
          ],
        },
        "*Hint:* When types are derived with `z.infer<typeof Schema>`, updating the schema automatically updates your TypeScript types everywhere.",
        "*Solution & Fix:* When you hand-write interfaces, client types and backend responses inevitably drift. By sharing a single schema (or generating client types from an OpenAPI / Zod schema), updating the backend schema immediately updates your frontend types, turning contract changes into instant compiler feedback.",
      ],
    },
  ],

  pullQuotes: [
    {
      quote: "Inside your codebase, TypeScript checks every line. But at the boundary with the internet, TypeScript goes blind.",
    },
    {
      quote: "Writing 'as User' is flashing a fake passport. It tricks the compiler, but it doesn't change what arrived.",
    },
    {
      quote: "Parse at the front door once so the rest of your app can relax and trust its types.",
    },
  ],
};
