export const fs4UtilityTypes = {
  slug: "fs-4-utility-types",
  category: "Engineering",
  subcategory: "Full-Stack Prep // TypeScript",
  title: "How Utility Types Work: Transforming Types Without the Magic",
  excerpt:
    "You use Partial, Pick, and Omit every day, but they often feel like built-in magic spells. This lesson demystifies utility types by building them from scratch: how loops over keys work, how conditional types act like if-statements, and how infer lets you extract pieces from existing shapes.",
  image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1200&h=675&fit=crop",
  imageAlt: "Engineer's hands over a technical blueprint showing precision design",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  date: "2026-08-16",
  added: "2026-08-16T00:00:00+03:00",
  tags: ["Full-Stack Prep", "TypeScript"],
  topics: ["technology", "career"],
  archived: false,

  intro: "*You use Partial, Pick, and Omit every single day. But where do they actually come from? Are they hardcoded into the compiler, or are they written in the same TypeScript language you use? The answer is surprising: every standard utility is just a two-line recipe. Once you see the simple loops and if-statements the type system provides, the mystery disappears completely.*",

  body: [
    "Most programming languages treat types as static labels attached to variables. TypeScript is different: its type system has its own tiny programming language. You can inspect existing types, loop over their properties, filter out keys, and compute brand-new shapes on the fly. This lesson takes the covers off that engine so you can see the simple gears inside.",
  ],

  bentoHighlights: [
    {
      label: "THE LOOP",
      title: "Mapped Types are for...in Loops",
      description: "`[K in keyof T]` simply iterates over every property in an object. You can make properties optional, make them readonly, or transform their values in two lines of code.",
    },
    {
      label: "THE IF STATEMENT",
      title: "Conditional Types are Ternary Operators",
      description: "`T extends string ? true : false` is an if-statement for types. If `T` fits into `string`, return one type; otherwise return another.",
    },
    {
      label: "THE DESTRUCTURING",
      title: "infer Pulls Values Out of Types",
      description: "Just like JavaScript destructuring unpacks values from an object, `infer` unpacks types from inside functions, promises, and arrays.",
    },
  ],

  sections: [
    {
      heading: "4.1 Recap of Lesson 3: Narrowing Down to One Box",
      paragraphs: [
        "In Lesson 3, we saw how putting a string literal tag on an object lets TypeScript narrow down possibilities at runtime.",
        "Now we look at the other direction: transforming shapes at compile time. Instead of checking which shape you received, how do you take an existing shape like `User` and derive a new shape like `Partial<User>` or `Pick<User, 'id'>` without repeating yourself?",
      ],
    },
    {
      heading: "4.2 The Common Helpers: What Problems Do They Solve?",
      paragraphs: [
        "TypeScript ships with a handful of built-in helpers called utility types. They exist because real apps constantly need smaller variations of existing models:\n\n- **`Partial<User>`**: Makes every single field optional. Useful when a user is updating their profile and might only submit their new avatar or display name.\n- **`Required<User>`**: The opposite. Makes every optional field strictly required, ensuring nothing was left blank.\n- **`Pick<User, 'id' | 'name'>`**: Keeps only the specified fields, throwing away the rest. Useful when a summary card only needs two properties from a 30-column database table.\n- **`Omit<User, 'passwordHash'>`**: Keeps everything except the listed fields. Useful when sending a user object to a public API.",
        "The key rule is: derive, don't duplicate. If you create a brand-new `UserSummary` interface by hand-copying properties from `User`, the two shapes will inevitably drift out of sync when someone renames a column next month. Using `Pick<User, 'id' | 'name'>` keeps them linked forever.",
      ],
    },
    {
      heading: "4.3 Building Them by Hand: Mapped Types as Loops",
      paragraphs: [
        "None of these utilities are hardcoded in TypeScript. They are written in TypeScript itself using **mapped types**. A mapped type is just a `for...in` loop over object keys.",
        "Look at the basic pattern:\n\n```typescript\ntype Clone<T> = {\n  [K in keyof T]: T[K];\n};\n```",
        "Let's break that down word by word:\n1. `keyof T` gathers all the property names of `T` (like `'id' | 'name' | 'email'`).\n2. `[K in ...]` loops through each property name one by one, like a `for (const K of keys)` loop.\n3. `T[K]` looks up the type of that property on the original object.",
        "Now watch how easy it is to build `Partial`:\n\n```typescript\ntype MyPartial<T> = {\n  [K in keyof T]?: T[K];\n};\n```\nAll we did was add a single question mark `?` after `[K in keyof T]`. TypeScript loops through every property and marks it optional. That is the entire implementation of `Partial` in the standard library!",
        "And here is `Pick`:\n\n```typescript\ntype MyPick<T, K extends keyof T> = {\n  [P in K]: T[P];\n};\n```\nInstead of looping over all keys of `T`, it only loops over the subset `K` that you asked for. Two lines of code, and you just built `Pick`.",
        {
          type: "lab" as const,
          id: "lab-fs4-machinery",
          title: "The Mapped-Type Language, Executable",
          path: "fullstack/04-utility-types",
          step: { current: 1, total: 2, title: "Mapped Types" },
          summary:
            "Run the type computation engine across 5 independent probes: Partial<T> mapped loop (npm run lab:probe-1), Pick<T, K> and keyed constraint (npm run lab:probe-2), Omit<T, K> (npm run lab:probe-3), distributive conditional Exclude (npm run lab:probe-4), and pattern matching with infer (npm run lab:probe-5). Run all 5 together with npm run lab:machinery or step through interactively with npm run lab:step.",
          command: "npm run lab:machinery",
          output:
            "================================================================================\n  [Probe 1/5] Mapped Types: How Partial<T> Rebuilds Shapes\n================================================================================\n\nCode Under Test (src/shape_ops.ts):\n  type Partial<T> = { [K in keyof T]?: T[K] };\n  function myPartial(shape: ShapeDescriptor): ShapeDescriptor;\n\nExecution at Call Site:\n  const User = { id: \"string\", email: \"string\", role: \"string\", age: \"number\" };\n  const result = myPartial(User);\n\nBehind the Scenes in the TypeScript Compiler:\n  1. QUERY KEYS:       keyof User -> [\"id\", \"email\", \"role\", \"age\"]\n  2. MAPPED LOOP:      Iterates each member K in keyof T.\n  3. PROPERTY ACCESS:  T[K] indexes the original property type.\n  4. MODIFIER:         Appends '?' making each property optional.\n  5. TRANSFORMED TYPE: { id?: string; email?: string; role?: string; age?: number }",
          files: [
            {
              path: "src/shape_ops.ts",
              action: "inspect",
              language: "typescript",
              code: "/**\n * The mapped-type language, executable.\n *\n * A shape descriptor maps a member name to the name of the type it holds: the\n * runtime shadow of `keyof T`, `T[K]`, and `{ [K in keyof T]: ... }`.\n */\n\nexport type ShapeDescriptor = Record<string, string>;\n\n/** `keyof T`: the union of the shape's members. */\nexport function keysOf(shape: ShapeDescriptor): string[] {\n  return Object.keys(shape);\n}\n\n/** `T[K]`: the type stored at one member. */\nexport function memberOf(shape: ShapeDescriptor, key: string): string {\n  return shape[key];\n}\n\n/** `{ [K in keyof T]: ... }`: rebuild a shape through a transform. */\nexport function mapShape(\n  shape: ShapeDescriptor,\n  transform: (type: string, key: string) => string,\n): ShapeDescriptor {\n  return Object.fromEntries(\n    Object.entries(shape).map(([key, type]) => [key, transform(type, key)]),\n  );\n}\n\n/** `Partial<T>`: every member becomes optional. */\nexport function myPartial(shape: ShapeDescriptor): ShapeDescriptor {\n  return mapShape(shape, (type) => `${type} | undefined`);\n}\n\n/** `Pick<T, K>`: keep only the listed members; an unknown key is refused. */\nexport function myPick(shape: ShapeDescriptor, keys: string[]): ShapeDescriptor {\n  const picked: ShapeDescriptor = {};\n  for (const key of keys) {\n    if (!(key in shape)) throw new Error(`unknown member: ${key}`);\n    picked[key] = shape[key];\n  }\n  return picked;\n}\n\n/** `Omit<T, K>`: every member except the listed ones. */\nexport function myOmit(shape: ShapeDescriptor, keys: string[]): ShapeDescriptor {\n  const dropped = new Set(keys);\n  for (const key of keys) {\n    if (!(key in shape)) throw new Error(`unknown member: ${key}`);\n  }\n  const kept: ShapeDescriptor = {};\n  for (const key of keysOf(shape)) {\n    if (!dropped.has(key)) kept[key] = shape[key];\n  }\n  return kept;\n}\n\n/** `Record<K, V>`: one member per key, every one holding the same type. */\nexport function myRecord(keys: string[], type: string): ShapeDescriptor {\n  return Object.fromEntries(keys.map((key) => [key, type]));\n}\n\n/** The type a shape denotes, printed the way the mapped type would read. */\nexport function describeShape(shape: ShapeDescriptor): string {\n  const members = Object.entries(shape).map(([key, type]) => `${key}: ${type}`);\n  return members.length === 0 ? \"{}\" : `{ ${members.join(\"; \")} }`;\n}",
              description: "The mapped-type loop as object transforms: the three lines behind Partial, Pick, and Omit",
            },
            {
              path: "src/conditional_types.ts",
              action: "inspect",
              language: "typescript",
              code: "/**\n * The conditional-type language, executable.\n *\n * `T extends U ? X : Y` is checked once per member of a union and the results\n * re-union: the distribution behavior `Exclude` and `NonNullable` depend on.\n * The descriptors below carry a `kind` so `infer` can be modelled as a\n * destructure of the pattern that matched.\n */\n\nexport type ArrayDescriptor = { kind: \"array\"; element: string };\nexport type FunctionDescriptor = { kind: \"function\"; returns: string };\nexport type TypeDescriptor = ArrayDescriptor | FunctionDescriptor | { kind: \"other\" };\n\n/** `A extends (infer E)[] ? E : never`: the array pattern to destructure. */\nexport const arrayOf = (element: string): ArrayDescriptor => ({ kind: \"array\", element });\n\n/** `F extends (...args: any[]) => infer R ? R : never`: the signature pattern. */\nexport const fnOf = (returns: string): FunctionDescriptor => ({ kind: \"function\", returns });\n\n/** `Exclude<T, U>`: distribute, drop the members U covers, re-union. */\nexport function myExclude<T extends string>(members: T[], excluded: string[]): T[] {\n  const dropped = new Set(excluded);\n  return members.filter((member) => !dropped.has(member));\n}\n\n/** `NonNullable<T>`: the same recipe with a fixed exclusion set. */\nexport function myNonNullable<T>(members: T[]): T[] {\n  return members.filter((member) => member !== null && member !== undefined);\n}\n\n/** `T extends string ? true : false`, read one member at a time. */\nexport function isString(member: unknown): boolean {\n  return typeof member === \"string\";\n}\n\n/** The re-union: agreeing answers collapse to one, disagreeing ones to boolean. */\nexport function matchEach(members: unknown[], test: (m: unknown) => boolean): boolean | string {\n  const answers = members.map((member) => test(member));\n  return answers.every((answer) => answer === answers[0]) ? answers[0] : \"boolean\";\n}\n\n/** `infer`: the element bound by the array pattern, or never if it did not match. */\nexport function inferElement(descriptor: TypeDescriptor): string {\n  return descriptor.kind === \"array\" ? descriptor.element : \"never\";\n}\n\n/** `infer`: the return type bound by the signature pattern, or never. */\nexport function inferReturn(descriptor: TypeDescriptor): string {\n  return descriptor.kind === \"function\" ? descriptor.returns : \"never\";\n}",
              description: "Distribution and infer as a per-member filter and a pattern destructure",
            },
          ],
        },
      ],
    },
    {
      heading: "4.4 If-Statements in Types: Conditional Types",
      paragraphs: [
        "If mapped types are loops, what is the if-statement? It's called a **conditional type**, and it uses the exact same syntax as JavaScript's ternary operator:\n\n```typescript\ntype IsString<T> = T extends string ? true : false;\n\ntype A = IsString<string>; // true\ntype B = IsString<number>; // false\n```",
        "It reads just like regular code: if `T` fits inside `string`, evaluate to `true`; otherwise evaluate to `false`.",
        "The coolest feature of conditional types is that they automatically distribute over unions. If you pass `string | number`, TypeScript runs the check on `string` (evaluates to `true`), runs the check on `number` (evaluates to `false`), and combines the results into `true | false` (which simplifies to `boolean`).",
        "This is how `Exclude` works in the standard library:\n\n```typescript\ntype MyExclude<T, U> = T extends U ? never : T;\n\ntype Action = \"click\" | \"hover\" | \"scroll\";\ntype CleanAction = MyExclude<Action, \"scroll\">; // \"click\" | \"hover\"\n```",
        "When `T` is `'scroll'`, the check evaluates to `never` (disappearing completely). When `T` is `'click'` or `'hover'`, it keeps them. It's a filter for types!",
      ],
    },
    {
      heading: "4.5 Destructuring Types with 'infer'",
      paragraphs: [
        "What if you have a wrapper type like a Promise or an Array, and you want to extract what is inside? In regular JavaScript, you unpack values using destructuring. In TypeScript, you unpack types using `infer`:\n\n```typescript\ntype UnwrapPromise<T> = T extends Promise<infer R> ? R : T;\n\ntype Result = UnwrapPromise<Promise<string>>; // string\n```",
        "Look at `infer R`. It tells TypeScript: 'If `T` is a Promise, look at whatever is wrapped inside, give that inner type the temporary name `R`, and give me `R` back.'",
        "You can do the exact same thing with arrays to extract the element type:\n\n```typescript\ntype ElementType<T> = T extends (infer E)[] ? E : never;\n\ntype StringElement = ElementType<string[]>; // string\n```\n\n`infer` is pattern matching for types. You draw the shape you expect, slap `infer` in the spot you want to capture, and TypeScript extracts it for you.",
        "A vital engineering rule: never use utilities like `ReturnType<typeof myFunction>` to create types for your application. If a function returns a user or config, declare a named interface like `export interface UserProfile` right at the function and export it. Named interfaces document your API directly and give clean error messages.",
      ],
    },
    {
      heading: "4.6 Type Gymnastics vs Real Engineering",
      paragraphs: [
        "Once developers discover mapped types and `infer`, a common phase begins: writing giant, 10-line generic utilities to prove how clever they are. Deep recursive types, nested conditionals, and obscure string parsers.",
        "Here is the rule of thumb: **write types for people, not for compilers.**",
        "If you write a custom utility that takes your teammates five minutes of headache to understand, you didn't create an asset; you created technical debt. 95% of real-world needs are completely covered by composing the simple built-ins: `Partial`, `Pick`, `Omit`, and `Record`. Save custom mapped types for genuine library boundaries, and keep your application code readable and simple.",
      ],
    },
    {
      heading: "What You Just Learned",
      paragraphs: [
        "Here is what to remember from this lesson:\n\n- Utility types are not magic; they are simple one-line recipes you can write yourself.\n- `[K in keyof T]` loops through an object's keys, letting you modify or filter properties.\n- `T extends U ? X : Y` acts like an if-statement that runs across each member of a union.\n- `infer` unpacks types from inside functions, arrays, and promises like pattern matching.\n- Keep your types simple; don't write complex type gymnastics when basic built-ins do the job.",
      ],
    },
    {
      heading: "Practice Problems",
      paragraphs: [
        "**P1: Write the Standard Library by Hand.** Implement `MyPartial<T>`, `MyPick<T, K>`, and `MyOmit<T, K>` from scratch without using any built-in helpers, and explain in one sentence how each one works.",
        {
          type: "lab" as const,
          id: "lab-p1-utility-types",
          title: "Write the Standard Library by Hand",
          path: "fullstack/04-utility-types",
          step: { current: 1, total: 3, title: "Practice Problem 1" },
          summary:
            "myPartial returns every member unchanged and myOmit returns the members it was asked to drop, so the draft is still required and the API mask is the password hash. The tests assert the shapes the built-ins produce.",
          command: "npm run test:p1",
          output:
            "✖ Problem 1: MyPartial makes every member optional\n" +
            "  AssertionError [ERR_ASSERTION]: Expected every member to allow undefined, but got {\"id\":\"string\",\"name\":\"string\"}.\n" +
            "✔ Problem 1: MyPick keeps only the listed members\n" +
            "✖ Problem 1: MyOmit keeps everything except the listed members\n" +
            "  AssertionError [ERR_ASSERTION]: Expected the passwordHash member to be dropped from {\"id\":\"string\",\"name\":\"string\",\"passwordHash\":\"string\"}, but got {\"passwordHash\":\"string\"}.\n" +
            "\n" +
            "ℹ tests 3\n" +
            "ℹ pass 1\n" +
            "ℹ fail 2",
          files: [
            {
              path: "src/p1_my_utilities.ts",
              action: "modify" as const,
              language: "typescript",
              code: "/**\n * The three utilities this codebase leans on most, written out by hand: a form\n * draft is `MyPartial`, a card view model is `MyPick`, and an API mask is\n * `MyOmit`. A shape descriptor maps a member name to the name of its type.\n */\n\nexport type Shape = Record<string, string>;\n\n/** `Partial<T>`: the draft state, where any member may still be unset. */\nexport function myPartial(shape: Shape): Shape {\n  const draft: Shape = {};\n  for (const [key, type] of Object.entries(shape)) {\n    draft[key] = type;\n  }\n  return draft;\n}\n\n/** `Pick<T, K>`: keep only the listed members. */\nexport function myPick(shape: Shape, keys: string[]): Shape {\n  const picked: Shape = {};\n  for (const key of keys) {\n    picked[key] = shape[key];\n  }\n  return picked;\n}\n\n/** `Omit<T, K>`: everything except the listed members. */\nexport function myOmit(shape: Shape, keys: string[]): Shape {\n  const omitted: Shape = {};\n  for (const key of keys) {\n    omitted[key] = shape[key];\n  }\n  return omitted;\n}",
              description: "Missing the optional marker on every member, and Omit keeps the keys it should delete",
            },
          ],
        },
        "*Hint:* `MyPartial` adds a `?`. `MyPick` loops over `P in K`. `MyOmit` uses `MyPick<T, Exclude<keyof T, K>>`.",
        "*Solution & Fix:* `MyPartial<T> = { [K in keyof T]?: T[K] };`. `MyPick<T, K extends keyof T> = { [P in K]: T[P] };`. `MyOmit<T, K extends keyof any> = MyPick<T, Exclude<keyof T, K>>;`. Each helper transforms the keys of an object in a clean, predictable way.",
        "**P2: Filtering Unions with Exclude.** How does `Exclude<'a' | 'b' | 'c', 'c'>` remove `'c'` from a union? Explain what happens when a conditional type distributes over each member.",
        {
          type: "lab" as const,
          id: "lab-p2-utility-types",
          title: "The Distribution Trap",
          path: "fullstack/04-utility-types",
          step: { current: 2, total: 3, title: "Practice Problem 2" },
          summary:
            "myExclude compares the whole union with the exclusion set instead of one member at a time, so Exclude<'a' | 'b', 'a' | 'c'> keeps a and the filter never removes an individual covered member.",
          command: "npm run test:p2",
          output:
            "✖ Problem 2: Exclude filters one member at a time\n" +
            "  AssertionError [ERR_ASSERTION]: Expected Exclude<'a' | 'b', 'a' | 'c'> to keep \"b\", but got [\"a\",\"b\"].\n" +
            "\n" +
            "ℹ tests 2\n" +
            "ℹ pass 1\n" +
            "ℹ fail 1",
          files: [
            {
              path: "src/p2_distribution.ts",
              action: "modify" as const,
              language: "typescript",
              code: "/**\n * The filter recipe behind `Exclude` and `NonNullable`: compare the union with\n * the exclusion set, keep the members that survive, and union what is left.\n */\n\n/** `Exclude<T, U>` */\nexport function myExclude<T extends string>(members: T[], excluded: string[]): T[] {\n  const covered = members.every((member) => excluded.includes(member));\n  return covered ? [] : members;\n}\n\n/** `NonNullable<T>` */\nexport function myNonNullable<T>(members: T[]): T[] {\n  return members.filter((member) => member !== null && member !== undefined);\n}",
              description: "The non-distributing read: one comparison for the whole union",
            },
          ],
        },
        "*Hint:* When checking a union against `U`, TypeScript tests `'a'`, tests `'b'`, and tests `'c'` separately.",
        "*Solution & Fix:* `T extends U ? never : T` distributes across each union member. For `'a'`, `'a' extends 'c'` is false, returning `'a'`. For `'b'`, it returns `'b'`. For `'c'`, it is true, returning `never`. The union `'a' | 'b' | never` simplifies to `'a' | 'b'` because `never` represents the empty set.",
        "**P3: Extracting Promise Values.** Use `infer` to write an `UnwrapPromise<T>` type that extracts the resolved value from a `Promise<T>`.",
        {
          type: "lab" as const,
          id: "lab-p3-utility-types",
          title: "The Senior Judgment Call",
          path: "fullstack/04-utility-types",
          step: { current: 3, total: 3, title: "Practice Problem 3" },
          summary:
            "deepKeys recurses without passing the prefix down, so every nested leaf loses its parent path and two different leaves can collapse onto the same name.",
          command: "npm run test:p3",
          output:
            "✖ Problem 3: nested leaves keep the full path\n" +
            "  AssertionError [ERR_ASSERTION]: Expected nested leaves to be addressed by their full path, but got [\"id\",\"name\",\"city\"].\n" +
            "\n" +
            "ℹ tests 3\n" +
            "ℹ pass 2\n" +
            "ℹ fail 1",
          files: [
            {
              path: "src/p3_deep_keys.ts",
              action: "modify" as const,
              language: "typescript",
              code: "/**\n * Address nested form state by string path.\n *\n * A path labels a value that is not itself a plain object: nested objects are\n * walked so their leaves can be addressed directly, and an object with no\n * members is a leaf of its own. Paths join with \".\".\n */\n\nconst isPlainObject = (value: unknown): value is Record<string, unknown> =>\n  value !== null && typeof value === \"object\" && !Array.isArray(value);\n\nexport function deepKeys(value: unknown, prefix = \"\"): string[] {\n  const paths: string[] = [];\n  if (!isPlainObject(value)) return paths;\n  for (const [key, child] of Object.entries(value)) {\n    const path = prefix ? `${prefix}.${key}` : key;\n    if (isPlainObject(child) && Object.keys(child).length > 0) {\n      paths.push(...deepKeys(child));\n      continue;\n    }\n    paths.push(path);\n  }\n  return paths;\n}",
              description: "The recursive call drops the path built so far",
            },
          ],
        },
        "*Hint:* Write `T extends Promise<infer V> ? V : T`.",
        "*Solution & Fix:* `type UnwrapPromise<T> = T extends Promise<infer V> ? V : T;`. If `T` matches a `Promise`, it extracts and returns the inner type `V`. If `T` is not a promise, it returns `T` unchanged.",
      ],
    },
  ],

  pullQuotes: [
    {
      quote: "Utility types are not magic built-ins. They are two-line recipes you can write yourself.",
    },
    {
      quote: "Mapped types are loops over keys; conditional types are if-statements for shapes.",
    },
    {
      quote: "Write types for people, not for compilers. Avoid clever type gymnastics that teammates cannot read.",
    },
  ],
};
