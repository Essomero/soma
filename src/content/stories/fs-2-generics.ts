export const fs2Generics = {
  slug: "fs-2-generics",
  category: "Engineering",
  subcategory: "Full-Stack Prep // TypeScript",
  title: "Generics as Relationships: How Input Connects to Output",
  excerpt:
    "Generics look like complex algebra, but they are really just relationships between two points in your code. This lesson shows why 'any' and 'unknown' fail to preserve connections, how TypeScript infers types from arguments, and how to use constraints without over-engineering your codebase.",
  image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=675&fit=crop",
  imageAlt: "Abstract 3D shapes showing a mold that produces an infinite family of forms",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  publishedAt: "2026-08-15T21:00:00Z",
  tags: ["Full-Stack Prep", "TypeScript"],
  topics: ["technology", "career"],
  archived: false,

  intro: "*You write a simple wrapper function that takes an item and returns it. If you use 'any', TypeScript forgets what the item was. If you use 'unknown', TypeScript locks the item in a vault and won't let you touch it. You don't want amnesia, and you don't want a locked vault. You want a relationship: whatever goes into this function is exactly what comes out. That relationship is what generics are for.*",

  body: [
    "Most tutorials explain generics by talking about abstract type parameters and category theory. That makes people think generics are advanced syntax reserved for library authors. But in real software, a generic is just a sentence connecting two dots: 'The return value has the exact same shape as the argument,' or 'The second argument must be a valid key of the first object.'",
  ],

  bentoHighlights: [
    {
      label: "THE MENTAL MODEL",
      title: "The Airport Luggage Carousel",
      description: "When you check in a red suitcase at the airport, you expect your red suitcase back on the carousel. `<T>(item: T): T` is the claim ticket that guarantees you get the exact same item back.",
    },
    {
      label: "THE GATEKEEPER",
      title: "Constraints Set the Rules with extends",
      description: "An unconstrained `<T>` accepts anything, from a number to a database connection. Using `T extends { id: string }` ensures the item has the fields you need before your code runs.",
    },
    {
      label: "THE DISCIPLINE",
      title: "Don't Genericize What Never Changes",
      description: "If every caller passes the exact same shape, adding `<T>` is just decoration. The best engineers delete type parameters that nobody actually varies.",
    },
  ],

  sections: [
    {
      heading: "2.1 Recap of Lesson 1: Shapes Over Names",
      paragraphs: [
        "In Lesson 1, we saw that TypeScript is structural. It doesn't care what brand of backpack you carry, as long as it contains the water and compass the trail guide requested.",
        "Now we take the next step. What happens when a function doesn't know what backpack you are carrying in advance, but needs to guarantee you get the exact same backpack back? That is where relationships come in.",
      ],
    },
    {
      heading: "2.2 The Problem: Why 'any' and 'unknown' Both Break Down",
      paragraphs: [
        "Imagine you write a simple caching function or logger:\n\n```typescript\nfunction logAndReturn(item: any) {\n  console.log(item);\n  return item;\n}\n```",
        "If you pass a `User` into `logAndReturn`, what does TypeScript think comes out? It thinks `any` comes out. The type system completely forgot that you had a `User`. You just erased all type safety downstream.",
        "So you try to be responsible and use `unknown` instead:\n\n```typescript\nfunction logAndReturn(item: unknown) {\n  console.log(item);\n  return item;\n}\n\nconst user = logAndReturn({ id: \"u1\", name: \"Ada\" });\nconsole.log(user.name); // Error: Object is of type 'unknown'\n```",
        "Now TypeScript remembers that you passed *something*, but it refuses to let you read `.name` without manually casting it back. `any` forgets everything; `unknown` locks everything down. Neither one connects the input to the output.",
      ],
    },
    {
      heading: "2.3 The Solution: The Luggage Claim Ticket",
      paragraphs: [
        "This is the exact problem generics solve. Instead of hardcoding a type, you introduce a type variable, traditionally named `T`:\n\n```typescript\nfunction logAndReturn<T>(item: T): T {\n  console.log(item);\n  return item;\n}\n\nconst user = logAndReturn({ id: \"u1\", name: \"Ada\" });\nconsole.log(user.name); // Perfectly safe! TypeScript knows user has .name\n```",
        "Look at what `<T>(item: T): T` says in plain English: 'For whatever specific type `T` goes into this function, that exact same type `T` comes out.'",
        "Think of `<T>` as a luggage claim ticket at the airport. You hand the airline your red suitcase. They staple ticket #42 to your bag and hand you ticket #42. When you reach your destination, you hand in ticket #42 and receive your red suitcase. You don't get a mystery box, and you don't get a random stranger's luggage. The ticket connects check-in to pickup.",
        {
          type: "lab" as const,
          id: "lab-generics-1",
          title: "The Relationship, Executable",
          path: "fullstack/02-generics",
          step: { current: 1, total: 2, title: "The Relationship" },
          summary:
            "Probe the core identity relationship as an executable experiment. Watch <T>(x: T): T preserve types across primitives, arrays, and object shapes, while any erases the type and unknown blocks downstream access without explicit evidence. You can run all 3 probes together (npm run lab:relationship), run probe by probe (npm run lab:probe-1), or step through interactively (npm run lab:step).",
          command: "npm run lab:relationship",
          output:
            "================================================================================\n  [Probe 1/3] Primitive Value: The Identity Relationship\n================================================================================\n\nCode Under Test (src/relationship.ts):\n  function identity<T>(value: T): { tag: string; value: T } { return { tag: tagOf(value), value }; }\n  function identityAny(value: any): { tag: string; value: any } { return { tag: \"any\", value }; }\n  function identityUnknown(value: unknown): { tag: string; value: unknown } { return { tag: \"unknown\", value }; }\n\nExecution at Call Site:\n  const input = \"hello\";\n  const result = identity(input);\n\nBehind the Scenes in the TypeScript Compiler:\n  1. CALL SITE:       identity(\"hello\") is evaluated.\n  2. INFERENCE SITE:  The argument \"hello\" is inspected.\n  3. TYPE INFERRED:   T is bound to string.\n  4. PRESERVED TYPE:  result.value is proven to be string.\n  5. CONTRAST:        identityAny loses the type (returns any).\n                      identityUnknown blocks property access (returns unknown).",
          files: [
            {
              path: "src/relationship.ts",
              action: "inspect",
              language: "typescript",
              code: "/**\n * The identity relationship, executable.\n *\n * Every generic is a sentence about how one type moves with another; the\n * canonical one is `<T>(x: T): T`: for every call, the return type is exactly\n * the argument type. The wrappers below show what the alternatives fail to\n * express: `any` erases the type, `unknown` refuses to commit to it.\n */\n\nexport function tagOf(value: unknown): string {\n  if (value === null) return \"null\";\n  if (Array.isArray(value)) {\n    return value.length === 0 ? \"array<empty>\" : `array<${tagOf(value[0])}>`;\n  }\n  return typeof value;\n}\n\n/** The relationship: the tag that goes in is the tag that comes out. */\nexport function identity<T>(value: T): { tag: string; value: T } {\n  return { tag: tagOf(value), value };\n}\n\n/** `any` erases the type: every caller gets an untyped result back. */\nexport function identityAny(value: any): { tag: string; value: any } {\n  return { tag: \"any\", value };\n}\n\n/** `unknown` refuses to commit: every caller must re-state the type. */\nexport function identityUnknown(value: unknown): { tag: string; value: unknown } {\n  return { tag: \"unknown\", value };\n}",
              description: "The three functions side by side: typed relationship, erased, uncommitted",
            },
          ],
        },
      ],
    },
    {
      heading: "2.4 Where Does T Come From? (Inference Sites)",
      paragraphs: [
        "Notice that when we called `logAndReturn({ id: 'u1', name: 'Ada' })`, we didn't have to write `logAndReturn<{ id: string; name: string }>(...)`. TypeScript figured it out on its own.",
        "How did it know? Because TypeScript looks at the arguments you pass. The argument position is an **inference site**. TypeScript inspects the value you handed the function, sees its shape, and automatically assigns that shape to `T`.",
        "When does this get annoying? When a generic only appears in the return value:\n\n```typescript\nfunction makeEmpty<T>(): T {\n  // returns an empty item\n}\n\nconst item = makeEmpty(); // Error: TypeScript has no clue what T is!\n```",
        "If a function has no arguments to inspect, TypeScript has nowhere to look. You are forced to manually specify the type every single time: `makeEmpty<User>()`. That is why the friendliest generic functions always infer their types directly from their arguments.",
      ],
    },
    {
      heading: "2.5 Guardrails: Setting Requirements with 'extends'",
      paragraphs: [
        "What if your function needs to read a specific property on the item it receives?",
        "```typescript\nfunction printId<T>(item: T) {\n  console.log(item.id); // Error: Property 'id' does not exist on type 'T'\n}\n```",
        "Why does this error? Because `T` could be literally anything. Someone could pass the number `42` or the boolean `true`, neither of which has an `.id`. TypeScript protects you from that crash.",
        "To fix this, you tell TypeScript that `T` is not completely open-ended. It must meet a minimum requirement. In TypeScript, we write that requirement with `extends`:\n\n```typescript\nfunction printId<T extends { id: string }>(item: T): T {\n  console.log(item.id); // Safe! TypeScript knows every T has an id\n  return item;\n}\n```",
        "`T extends { id: string }` acts like a bouncer at the club door. If you bring an object with an `id`, the bouncer lets you inside and your function can safely read `item.id`. If someone tries to pass `42`, TypeScript stops them right at the function call.",
        "The most useful version of this is indexing an object by key. Suppose you want a function that reads a property from an object:\n\n```typescript\nfunction getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {\n  return obj[key];\n}\n\nconst user = { id: \"u1\", name: \"Ada\", email: \"ada@example.com\" };\nconst name = getProperty(user, \"name\"); // string\nconst bad = getProperty(user, \"age\"); // Error: 'age' is not a valid key on user!\n```",
        "Look at that relationship: `K extends keyof T`. It says: 'The key parameter `K` must be one of the actual property names of the object `T`.' If you make a typo like `'nane'`, TypeScript catches it before your code ever runs.",
        {
          type: "lab" as const,
          id: "lab-generics-2",
          title: "The Constraint as License and Gate",
          path: "fullstack/02-generics",
          step: { current: 2, total: 2, title: "Constraints" },
          summary:
            "Test constraints as entrance requirement and internal license. Watch the keyed constraint K extends keyof T license valid property indexing, while gating out invalid keys and blocking runtime RangeError before execution.",
          command: "npm run lab:constraints",
          output:
            "================================================================================\n  TypeScript Generics Lab: The Constraint as License and Gate\n================================================================================\n\n[Probe 1] Keyed Constraint: at(obj, key) with valid key 'name'\nTested Function: at(obj, key): representing <T, K extends keyof T>(obj: T, key: K): T[K]\nTarget object:   {\"id\":\"u1\",\"name\":\"Ada Lovelace\",\"role\":\"admin\"}\nAllowed keys (keyof T): [\"id\", \"name\", \"role\"]\nRequested key K: \"name\"\n  Entrance Gate:    PASS (\"name\" satisfies 'K extends keyof T')\n  Internal License: GRANTED (safe to index obj[\"name\"])\n  Result value:     \"Ada Lovelace\" (type: string)\n\n[Probe 2] Keyed Constraint: at(obj, key) with missing key 'salary'\nTested Function: at(obj, key): representing <T, K extends keyof T>(obj: T, key: K): T[K]\nTarget object:   {\"id\":\"u1\",\"name\":\"Ada Lovelace\",\"role\":\"admin\"}\nAllowed keys (keyof T): [\"id\", \"name\", \"role\"]\nRequested key K: \"salary\"\n  Entrance Gate:    REFUSED (TS2345: Argument of type '\"salary\"' is not assignable to keyof T)\n  Runtime Guard:    Blocked before access (RangeError: key 'salary' is not a key of the object)\n\n[Probe 3] Entrance Requirement: requireMembers(value, ['id', 'role'])\nTested Function: requireMembers(value, members): representing <T extends { id, role }>(val: T): T\nInput value:     {\"id\":\"u1\",\"name\":\"Ada Lovelace\",\"role\":\"admin\"}\nConstraint:      T extends { id, role }\n  Entrance Gate:    PASS (satisfies required members: [id, role])\n\n[Probe 4] Entrance Requirement: requireMembers(value, ['id', 'department'])\nTested Function: requireMembers(value, members): representing <T extends { id, department }>(val: T): T\nInput value:     {\"id\":\"u1\",\"name\":\"Ada Lovelace\",\"role\":\"admin\"}\nConstraint:      T extends { id, department }\n  Entrance Gate:    REFUSED (does not satisfy the constraint: missing department)",
          files: [
            {
              path: "src/constraints.ts",
              action: "inspect",
              language: "typescript",
              code: "/**\n * Constraints: the entrance requirement and the body's license.\n *\n * A constraint says which family of types a function serves. `requireMembers`\n * is the entrance requirement: a value that cannot meet it is refused with a\n * message naming the missing member. `at` is the keyed workhorse,\n * `K extends keyof T`: a key the object does not have is refused before any\n * member access happens.\n */\n\nexport function requireMembers<T extends Record<string, unknown>>(\n  value: unknown,\n  members: string[],\n): T {\n  const missing = members.filter(\n    (member) =>\n      value === null ||\n      typeof value !== \"object\" ||\n      !Object.prototype.hasOwnProperty.call(value, member),\n  );\n  if (missing.length > 0) {\n    throw new TypeError(\n      `does not satisfy the constraint: missing ${missing.join(\", \")}`,\n    );\n  }\n  return value as T;\n}\n\nexport function at<T extends Record<string, unknown>, K extends keyof T>(\n  object: T,\n  key: K,\n): T[K] {\n  if (\n    object === null ||\n    typeof object !== \"object\" ||\n    !Object.prototype.hasOwnProperty.call(object, key)\n  ) {\n    throw new RangeError(`key '${String(key)}' is not a key of the object`);\n  }\n  return object[key];\n}",
              description: "Entrance requirement and keyed member access",
            },
          ],
        },
      ],
    },
    {
      heading: "2.6 When to Delete Your Generic",
      paragraphs: [
        "A common trap when learning TypeScript is putting `<T>` everywhere because it feels sophisticated. But adding type parameters when you don't need them makes your codebase harder to read and harder to debug.",
        "Here are the two warning signs that a generic should be deleted:",
        "**1. No one ever varies the type:**\nIf your function takes `<T>` but every single place in your app calls it with a `User`, it is not generic. Delete `<T>` and just write `user: User`. Your code will be simpler, and your teammates will thank you.",
        "**2. The type variable only appears once:**\nLook at this function:\n\n```typescript\nfunction printName<T extends { name: string }>(item: T): void {\n  console.log(item.name);\n}\n```\n\nNotice that `T` appears in the argument, but nowhere in the return value! The function doesn't return anything. There is no relationship to preserve. You can rewrite this much more cleanly without generics at all:\n\n```typescript\nfunction printName(item: { name: string }): void {\n  console.log(item.name);\n}\n```\n\nBoth versions do the exact same thing, but the second version doesn't make the reader stop and wonder why a generic was needed.",
      ],
    },
    {
      heading: "What You Just Learned",
      paragraphs: [
        "Here is what to remember from this lesson:\n\n- Generics are not for sounding smart; they connect input types to output types.\n- `any` erases type safety, while `unknown` locks your data away until you cast it.\n- `<T>(x: T): T` acts like a claim ticket: what goes in is guaranteed to come out.\n- `extends` sets minimum requirements, like demanding an object have an `id`.\n- If a type parameter only appears once in a function signature, you probably don't need it.",
      ],
    },
    {
      heading: "Practice Problems",
      paragraphs: [
        "**P1: The Constrained Wrapper.** Look at this function signature:\n\n```typescript\nfunction getById<T extends { id: string }>(items: T[], id: string): T | undefined {\n  return items.find((item) => item.id === id);\n}\n```\n\nWhat does `T extends { id: string }` do for the person calling `getById`, and what does it do for the function body itself?",
        {
          type: "lab" as const,
          id: "lab-p1-generics",
          title: "The Constraint as Entrance Requirement",
          path: "fullstack/02-generics",
          step: { current: 1, total: 3, title: "Practice Problem 1" },
          summary:
            "getById reads item.id without enforcing the { id: string } constraint it claims, so a malformed list is searched as if every item had an id and a match is returned. The test asserts the malformed list is refused, naming the index of the offending item.",
          command: "npm run test:p1",
          output:
            "✖ Problem 1: an item that does not satisfy the constraint is refused, naming the index\n  AssertionError [ERR_ASSERTION]: Missing expected exception: Expected the malformed list to be refused with \"item at index 1 does not satisfy { id: string }\", but the call returned {\"id\":\"u1\"}.\n\nℹ tests 3\nℹ pass 2\nℹ fail 1",
          files: [
            {
              path: "src/p1_constrained_wrapper.ts",
              action: "modify" as const,
              language: "typescript",
              code: "/** Look an item up by its id. */\nexport function getById<T extends { id: string }>(items: T[], id: string): T | undefined {\n  return items.find((item) => item.id === id);\n}",
              description: "Searches without enforcing the { id: string } entrance requirement",
            },
          ],
        },
        "*Hint:* Think about what the function body is allowed to read, and what callers are allowed to pass.",
        "*Solution & Fix:* For the caller, the constraint acts as an entrance gate: they cannot pass a list of numbers or booleans. For the function body, the constraint acts as permission: TypeScript allows `item.id` to be read without squawking because every item is guaranteed to have an `id`.",
        "**P2: Delete the Unnecessary Generic.** Look at this code:\n\n```typescript\nfunction formatUser<T extends { name: string }>(user: T): string {\n  return `User: ${user.name}`;\n}\n```\n\nWhy is `<T>` completely unnecessary here, and how would you simplify it?",
        {
          type: "lab" as const,
          id: "lab-p2-generics",
          title: "Delete the Generic No Caller Varies",
          path: "fullstack/02-generics",
          step: { current: 2, total: 3, title: "Practice Problem 2" },
          summary:
            "The <R, P> signature no caller varies, so the body has to index params blindly and a placeholder with no matching key is interpolated as undefined into the rendered path. The test asserts an honest refusal that names the missing key.",
          command: "npm run test:p2",
          output:
            "✖ Problem 2: a placeholder with no param is refused, naming the key\n  AssertionError [ERR_ASSERTION]: Missing expected exception: Expected a refusal naming \"postId\", but the call returned \"/users/42/posts/undefined\".\n\nℹ tests 3\nℹ pass 2\nℹ fail 1",
          files: [
            {
              path: "src/p2_over_generalized.ts",
              action: "modify" as const,
              language: "typescript",
              code: "/**\n * Render a route template by substituting {name} placeholders from params.\n * Callers pass a concrete path literal and a small params object.\n */\nexport function route<R extends string, P extends Record<string, unknown>>(path: R, params: P): string {\n  return path.replace(/{([^}]+)}/g, (_, key) => String(params[key]));\n}",
              description: "The over-generalized signature, and the blind index of params",
            },
          ],
        },
        "*Hint:* Notice that `T` is only used once in the parameter, and the return type is just a plain `string`.",
        "*Solution & Fix:* The function returns a plain `string`, so there is no relationship between input and output to preserve. The generic adds noise. Simplify it to: `function formatUser(user: { name: string }): string`. It accepts any object with a name property thanks to structural typing.",
        "**P3: Keyed Lookup.** Write a function `pluck<T, K extends keyof T>(items: T[], key: K): T[K][]` that takes a list of objects and extracts an array of values for the given key.",
        {
          type: "lab" as const,
          id: "lab-p3-generics",
          title: "pick and the K extends keyof T Constraint",
          path: "fullstack/02-generics",
          step: { current: 3, total: 3, title: "Practice Problem 3" },
          summary:
            "The shipped pick copies whatever keys it is handed, so a key the object does not have becomes an undefined member instead of a refusal. The test asserts the keyed constraint holds: an unknown key is rejected, naming the key.",
          command: "npm run test:p3",
          output:
            "✖ Problem 3: a key the object does not have is refused, naming the key\n  AssertionError [ERR_ASSERTION]: Missing expected exception: Expected the unknown key to be refused, but the call returned keys [\"nonexistent\"].\n\nℹ tests 3\nℹ pass 2\nℹ fail 1",
          files: [
            {
              path: "src/p3_build_pick.ts",
              action: "modify" as const,
              language: "typescript",
              code: "/**\n * Return a new object holding only the requested keys of the source.\n */\nexport function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {\n  const out = {} as Pick<T, K>;\n  for (const key of keys) out[key] = obj[key];\n  return out;\n}",
              description: "pick without the keyed-constraint refusal",
            },
          ],
        },
        "*Hint:* Map over `items` and return `item[key]`.",
        "*Solution & Fix:* `function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] { return items.map((item) => item[key]); }`. The keyed constraint `K extends keyof T` ensures you cannot pass a key that doesn't exist on `T`, and `T[K][]` tells TypeScript that the return array holds the exact type of that property.",
      ],
    },
  ],

  pullQuotes: [
    {
      quote: "Generics are not for sounding smart. They are claim tickets that guarantee what went in is what comes out.",
    },
    {
      quote: "extends acts like a bouncer at the door, making sure an object has the fields you need before your code runs.",
    },
    {
      quote: "If a type parameter only appears once in your signature, you probably don't need it.",
    },
  ],
};
