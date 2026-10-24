export const fs3DiscriminatedUnions = {
  slug: "fs-3-discriminated-unions",
  category: "Engineering",
  subcategory: "Full-Stack Prep // TypeScript",
  title: "Discriminated Unions & Narrowing: Making Impossible States Impossible",
  excerpt:
    "You modeled state with three booleans: isLoading, isError, and data. At 2 AM, your app crashed because all three were true at the same time. This lesson shows how discriminated unions eliminate impossible states, how string literal tags guide the compiler, and how to use exhaustiveness checking so new features never slip past you unnoticed.",
  image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&h=675&fit=crop",
  imageAlt: "Mist rolling over branching mountain ridges showing paths that fork and narrow",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  date: "2026-08-16",
  added: "2026-08-16T00:00:00+03:00",
  tags: ["Full-Stack Prep", "TypeScript"],
  topics: ["technology", "career"],
  archived: false,
  listed: false,

  intro: "*You fetch data from an API and track it with three boolean flags: isLoading, isError, and data. Everything seems fine until an edge case hits: your user sees a loading spinner, an error alert, and a profile card all on screen at the exact same second. How did that happen? Because three boolean flags create eight possible combinations, but only three make sense in the real world. This lesson shows how to build data shapes that make impossible states impossible to write.*",

  body: [
    "Most bugs in web apps don't come from complex math; they come from impossible states. You have a loading screen that shows an error message, or a payment form that claims to be both pending and failed. When you model state with loose flags, you have to write dozens of defensive `if` checks to make sure your flags don't contradict each other. Discriminated unions solve this at the root: by putting a clear label on your data, TypeScript makes it impossible to touch properties that don't belong to the current state.",
  ],

  bentoHighlights: [
    {
      label: "THE FRICTION",
      title: "The 2 AM Boolean Trap",
      description: "Three booleans create eight possible combinations. If all three turn true at once, your UI displays a monster. Discriminated unions replace eight fragile states with exactly the ones that make sense.",
    },
    {
      label: "THE MENTAL MODEL",
      title: "A Bright Label on the Box",
      description: "Every member of the union carries a specific tag, like `status: 'success'` or `status: 'error'`. TypeScript reads the tag first, throws the other boxes in the trash, and lets you open the lid safely.",
    },
    {
      label: "THE TRIPWIRE",
      title: "Exhaustive Checks with never",
      description: "When a teammate adds a new state tomorrow, `assertNever` breaks the build immediately on every screen that forgot to handle it. The compiler becomes your automated checklist.",
    },
  ],

  sections: [
    {
      heading: "3.1 The 2 AM Crash: Why Boolean Flags Betray You",
      paragraphs: [
        "Almost every frontend developer has written code like this:\n\n```typescript\ninterface AsyncState {\n  isLoading: boolean;\n  isError: boolean;\n  errorMessage?: string;\n  data?: User;\n}\n```",
        "It looks clean and familiar. But look closely at the math. `isLoading` can be true or false (2 states). `isError` can be true or false (2 states). `data` can be present or absent (2 states). That is 2 × 2 × 2 = 8 possible combinations.",
        "How many of those 8 combinations make sense in reality?\n\n1. Idle / Loading: `isLoading = true`\n2. Success: `data` is present\n3. Error: `isError = true` and `errorMessage` is present",
        "Only 3 states are valid! The other 5 states are bugs waiting to happen. For example, what does it mean if `isLoading` is true AND `isError` is true AND `data` is present? Your UI tries to render a spinner, an error banner, and a user card all at the same time. The user sees a broken screen, and you spend your morning untangling conflicting flags.",
      ],
    },
    {
      heading: "3.2 The Solution: Stamping a Label on the Box",
      paragraphs: [
        "Instead of keeping separate flags, what if our state could only ever be one specific thing at a time? In TypeScript, we do this by creating a union of distinct shapes, each carrying a shared tag:\n\n```typescript\ntype AsyncState<T> =\n  | { status: \"idle\" }\n  | { status: \"loading\" }\n  | { status: \"success\"; data: T }\n  | { status: \"error\"; error: Error };\n```",
        "Look at what this changes. It is now physically impossible to have `data` while `status` is `'loading'`. It is physically impossible to have an `error` while `status` is `'success'`. The invalid states don't just produce bugs; they cannot even be typed in the editor.",
        "Notice one crucial detail: the `status` field cannot just be `string`. If you write `status: string`, TypeScript knows nothing specific: a string could be `'potato'` or `'banana'`. But when you write `status: 'success'`, you are using a **string literal type**. That exact value becomes a unique, physical tag.",
        {
          type: "lab" as const,
          id: "lab-discriminated-unions-1",
          title: "The Discriminant, Executable",
          path: "fullstack/03-discriminated-unions",
          step: { current: 1, total: 2, title: "The Pattern" },
          summary:
            "Drive control-flow narrowing across a discriminated shape union with 4 independent probes. Watch the compiler eliminate variants branch by branch to license member access, and watch assertNever catch unhandled variants. Run all 4 together (npm run lab:dispatcher), probe by probe (npm run lab:probe-1 through probe-4), or step through interactively (npm run lab:step).",
          command: "npm run lab:dispatcher",
          output:
            "================================================================================\n  [Probe 1/4] Narrowing: Circle Variant Dispatch\n================================================================================\n\nCode Under Test (src/dispatcher.ts):\n  type Shape = Circle | Square | Rect;\n  function area(shape: Shape): number\n\nExecution at Call Site:\n  const shape = { kind: \"circle\", radius: 5 };\n  const result = area(shape);\n\nBehind the Scenes in the TypeScript Compiler:\n  1. DISCRIMINANT EVALUATION: Checks shape.kind === \"circle\".\n  2. CONTROL-FLOW ANALYSIS:   Eliminates Square and Rect variants.\n  3. PROVEN TYPE:             Narrowed to Circle ({ kind: \"circle\", radius: number }).\n  4. LICENSED ACCESS:         Accessing shape.radius is statically proven safe (value: 5).\n  5. COMPUTED RESULT:         78.54",
          files: [
            {
              path: "src/dispatcher.ts",
              action: "inspect",
              language: "typescript",
              code: "/**\n * A discriminated union of shapes and the dispatcher that narrows it.\n *\n * Every member carries a literal `kind`, so checking the discriminant proves\n * which member a value is before any other member is read. `assertNever` is the\n * exhaustiveness check: the branch that must be unreachable.\n */\n\nexport type Circle = { kind: \"circle\"; radius: number };\nexport type Square = { kind: \"square\"; side: number };\nexport type Rect = { kind: \"rect\"; width: number; height: number };\nexport type Shape = Circle | Square | Rect;\n\nexport function assertNever(value: never): never {\n  throw new Error(`unhandled case: ${JSON.stringify(value)}`);\n}\n\nexport function area(shape: Shape): number {\n  switch (shape.kind) {\n    case \"circle\":\n      return Math.round(Math.PI * shape.radius ** 2 * 100) / 100;\n    case \"square\":\n      return shape.side ** 2;\n    case \"rect\":\n      return shape.width * shape.height;\n    default:\n      return assertNever(shape);\n  }\n}",
            },
          ],
        },
      ],
    },
    {
      heading: "3.3 Looking Over the Compiler's Shoulder: How Narrowing Works",
      paragraphs: [
        "Now watch what happens when you write a function to render this state:\n\n```typescript\nfunction render(state: AsyncState<User>) {\n  if (state.status === \"loading\") {\n    return <Spinner />;\n  }\n\n  if (state.status === \"error\") {\n    return <ErrorAlert message={state.error.message} />;\n  }\n\n  if (state.status === \"success\") {\n    return <Profile user={state.data} />;\n  }\n}\n```",
        "Stand next to TypeScript as it reads line 6. Inside `if (state.status === 'error')`, TypeScript checks the label on the box. It sees `'error'`. It immediately eliminates `idle`, `loading`, and `success` from its memory.",
        "Because `error` is the only remaining possibility, TypeScript knows for a fact that `state.error` exists. You don't need any exclamation marks `state.error!`, and you don't need any casts `as Error`. TypeScript checked the label and opened the box for you.",
        "This process is called **narrowing**. Every time you check a tag with an `if` statement or a `switch`, TypeScript shrinks the list of possible shapes until only the matching one is left.",
      ],
    },
    {
      heading: "3.4 The Tripwire: Catching New Cases with 'never'",
      paragraphs: [
        "Now imagine six months pass. A teammate adds a new state to the union: `{ status: 'refunded'; refundId: string }`.",
        "How do you make sure every single screen in your application handles this new state without forgetting any? You use an exhaustive check with `never`:\n\n```typescript\nfunction assertNever(x: never): never {\n  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);\n}\n\nfunction render(state: AsyncState<User>) {\n  switch (state.status) {\n    case \"idle\": return <Placeholder />;\n    case \"loading\": return <Spinner />;\n    case \"success\": return <Profile user={state.data} />;\n    case \"error\": return <ErrorAlert message={state.error.message} />;\n    default: return assertNever(state);\n  }\n}\n```",
        "Look at that `default: assertNever(state)` line. The `never` type represents something that can never exist. If your `switch` statement handles every single possible status, then by the time execution reaches `default`, there are zero options left. The variable `state` has the type `never`. That compiles cleanly.",
        "But the moment your teammate adds `'refunded'` to the union, `state` in the default branch is no longer `never`. It is `{ status: 'refunded' }`. TypeScript refuses to pass that to `assertNever`, and the build immediately fails with a bright red squiggle on that exact line.",
        "Your compiler just became an automated to-do list. You don't have to search your codebase for files you might have forgotten; the compiler points straight to every single function that needs an update.",
        {
          type: "lab" as const,
          id: "lab-discriminated-unions-2",
          title: "Exhaustiveness in the Async-State Union",
          path: "fullstack/03-discriminated-unions",
          step: { current: 2, total: 2, title: "Exhaustiveness" },
          summary:
            "Simulate mutually exclusive async states (idle, loading, success, error) and probe the destructuring trap: see why destructuring state before the check breaks narrowing and leaks undefined. Run with npm run lab:async-state, or probe individually with npm run lab:probe-5 and npm run lab:probe-6.",
          command: "npm run lab:async-state",
          output:
            "================================================================================\n  [Probe 5/6] Async State Union: Mutual Exclusivity\n================================================================================\n\nCode Under Test (src/async_state.ts):\n  type AsyncState<T> = Idle | Loading | Success<T> | Error;\n  function view(state: AsyncState<T>)\n\nSimulated State Transitions:\n  • Idle:    { status: \"idle\" }                 -> view: { kind: \"placeholder\" }\n  • Loading: { status: \"loading\" }              -> view: { kind: \"spinner\" }\n  • Success: { status: \"success\", data: {...} } -> view: { kind: \"data\", value: {...} }\n  • Error:   { status: \"error\", error: Error }  -> view: { kind: \"error\", message: \"timeout\" }\n\nWhy this beats boolean flags (isLoading, isError, hasData):\n  With 3 booleans, 2^3 = 8 combinations exist (e.g. isLoading=true AND isError=true).\n  With a discriminated union, only the 4 valid states are representable in code.\n\n================================================================================\n  [Probe 6/6] The Destructuring Trap Simulation\n================================================================================\n\nCode Pattern Under Test:\n  // TRAP: Destructuring state before narrowing\n  const { status, data } = state;\n  if (status === \"success\") {\n    console.log(data); // In TypeScript, 'data' is disconnected from 'status'!\n  }\n\nWhy Narrowing Breaks:\n  1. Destructuring extracts local variables 'status' and 'data' BEFORE the if-check.\n  2. When 'if (status === \"success\")' runs, TypeScript narrows the local variable 'status'.\n  3. The local variable 'data' is NOT narrowed, because TypeScript tracks properties on the object, not disconnected locals.\n  4. Result: 'data' remains 'T | undefined', forcing ugly casts or causing undefined bugs.\n\nThe Senior Fix:\n  Keep the object intact and narrow on the property:\n  if (state.status === \"success\") {\n    console.log(state.data); // Narrowed cleanly to T!\n  }",
          files: [
            {
              path: "src/async_state.ts",
              action: "inspect",
              language: "typescript",
              code: "/**\n * Async state as a union of mutually exclusive members.\n *\n * idle | loading | success | error: the states cannot overlap, so no value can\n * carry both data and an error, or two load flags true at once.\n */\n\nimport { assertNever } from \"./dispatcher.ts\";\n\nexport type IdleState = { status: \"idle\" };\nexport type LoadingState = { status: \"loading\" };\nexport type SuccessState<T> = { status: \"success\"; data: T };\nexport type ErrorState = { status: \"error\"; error: Error };\n\nexport type AsyncState<T> =\n  | IdleState\n  | LoadingState\n  | SuccessState<T>\n  | ErrorState;\n\nexport const idle = (): IdleState => ({ status: \"idle\" });\n\nexport const loading = (): LoadingState => ({ status: \"loading\" });\n\nexport const success = <T>(data: T): SuccessState<T> => ({ status: \"success\", data });\n\nexport const failure = (error: unknown): ErrorState => ({\n  status: \"error\",\n  error: error instanceof Error ? error : new Error(String(error)),\n});\n\nexport type ViewResult<T> =\n  | { kind: \"placeholder\"; text: string }\n  | { kind: \"spinner\"; text: string }\n  | { kind: \"data\"; value: T }\n  | { kind: \"error\"; message: string };\n\nexport function view<T>(state: AsyncState<T>): ViewResult<T> {\n  switch (state.status) {\n    case \"idle\":\n      return { kind: \"placeholder\", text: \"Nothing requested yet\" };\n    case \"loading\":\n      return { kind: \"spinner\", text: \"Loading…\" };\n    case \"success\":\n      return { kind: \"data\", value: state.data };\n    case \"error\":\n      return { kind: \"error\", message: state.error.message };\n    default:\n      return assertNever(state as never);\n  }\n}",
            },
          ],
        },
      ],
    },
    {
      heading: "3.5 The Destructuring Trap: Don't Unpack Before You Read the Label",
      paragraphs: [
        "There is one common gotcha that confuses developers. Watch this innocent-looking mistake:\n\n```typescript\nfunction handle(state: AsyncState<User>) {\n  const { status, data } = state; // Destructuring upfront\n\n  if (status === \"success\") {\n    console.log(data.name); // Error: 'data' is possibly undefined!\n  }\n}\n```",
        "Why does TypeScript complain? You checked `if (status === 'success')`! Why doesn't it know `data` exists?",
        "Because when you destructured at the top, you pulled `status` and `data` out into two separate, independent local variables. When you checked `status === 'success'`, TypeScript narrowed the variable `status`. But it had no way of knowing that `data` was connected to it. You unpacked the box before checking the label on the outside.",
        "The fix is simple: keep the object intact and check the property directly on the object:\n\n```typescript\nfunction handle(state: AsyncState<User>) {\n  if (state.status === \"success\") {\n    console.log(state.data.name); // Safe and sound!\n  }\n}\n```",
        "When you check `state.status`, TypeScript narrows the entire `state` object, and `state.data` becomes fully available.",
      ],
    },
    {
      heading: "What You Just Learned",
      paragraphs: [
        "Here is what to remember from this lesson:\n\n- Three boolean flags create eight combinations; a discriminated union only allows valid states.\n- The tag must be a literal string like `'success'`, not a generic `string`.\n- Checking the tag lets TypeScript eliminate the other shapes and unlock the right properties.\n- An exhaustive `assertNever` check turns forgotten cases into build errors when new states are added.\n- Check the tag on the object directly instead of destructuring variables upfront.",
      ],
    },
    {
      heading: "Practice Problems",
      paragraphs: [
        "**P1: The Payment Response Union.** Model a payment response as a discriminated union with three states: paid (with an `id`), pending (with `requiresAction: true`), and failed (with an `errorCode: string`). Write a function that handles all three states and uses `assertNever` to guarantee exhaustiveness.",
        {
          type: "lab" as const,
          id: "lab-p1-discriminated-unions",
          title: "The API Response Union and Its Exhaustive Handler",
          path: "fullstack/03-discriminated-unions",
          step: { current: 1, total: 3, title: "Practice Problem 1" },
          summary:
            "summarize handles the three union members but falls through to the failure branch for anything else, so a status the union does not cover reads as a failed payment. The test asserts the uncovered status is refused as unreachable instead.",
          command: "npm run test:p1",
          output:
            "✖ Problem 1: a status the union does not cover is unreachable, not a failure\n  AssertionError [ERR_ASSERTION]: Missing expected exception: Expected an uncovered status to be refused as unreachable, but the call returned \"failed undefined\".\n\nℹ tests 4\nℹ pass 3\nℹ fail 1",
          files: [
            {
              path: "src/p1_api_response.ts",
              action: "modify" as const,
              language: "typescript",
              code: "/**\n * Summarize a payment API response as one line for the status panel.\n */\nexport type PaymentResponse =\n  | { status: \"paid\"; id: string }\n  | { status: \"pending\" }\n  | { status: \"failed\"; errorCode: string };\n\nexport function summarize(response: PaymentResponse): string {\n  if (response.status === \"paid\") return `paid ${response.id}`;\n  if (response.status === \"pending\") return \"pending action required\";\n  return `failed ${(response as any).errorCode}`;\n}",
              description: "Falls through to the failure branch for any status it does not know",
            },
          ],
        },
        "*Hint:* Use a `switch (response.status)` with a `default: return assertNever(response);` branch.",
        "*Solution & Fix:* Create three distinct object shapes sharing `status: 'paid' | 'pending' | 'failed'`. In the `switch` statement, each case narrows `response` to its specific shape. If someone adds a `'refunded'` state later, the `default` branch will fail to compile until that state is handled.",
        "**P2: Spot the Destructuring Trap.** Look at this code:\n\n```typescript\ntype Doc =\n  | { type: \"text\"; body: string }\n  | { type: \"image\"; url: string };\n\nfunction show(d: Doc) {\n  const { type, body } = d;\n  if (type === \"text\") {\n    return body;\n  }\n}\n```\n\nWhy does `return body;` trigger an error, and how do you fix it?",
        {
          type: "lab" as const,
          id: "lab-p2-discriminated-unions",
          title: "The Destructure Trap and the Optional alt",
          path: "fullstack/03-discriminated-unions",
          step: { current: 2, total: 3, title: "Practice Problem 2" },
          summary:
            "describe destructures the union before narrowing, so every branch reads pre-narrowed values and the optional alt prints as undefined. The tests assert the image branch omits the suffix when alt is absent and that an unknown document type is refused.",
          command: "npm run test:p2",
          output:
            "✖ Problem 2: an image without alt omits the suffix instead of printing undefined\n  AssertionError [ERR_ASSERTION]: Expected \"a.png\" when alt is absent, but got \"a.png (undefined)\".\n✖ Problem 2: a document type outside the union is unreachable, not echoed back\n  AssertionError [ERR_ASSERTION]: Missing expected exception: Expected an unknown document type to be refused as unreachable, but the call returned \"video\".\n\nℹ tests 4\nℹ pass 2\nℹ fail 2",
          files: [
            {
              path: "src/p2_trap_hunt.ts",
              action: "modify" as const,
              language: "typescript",
              code: "/**\n * Describe a document as a one-line string for the document list.\n */\nexport type TextDoc = { type: \"text\"; body: string };\nexport type ImageDoc = { type: \"image\"; url: string; alt?: string };\nexport type Doc = TextDoc | ImageDoc;\n\nexport function describe(doc: Doc): string {\n  const { type, body, url, alt } = doc as any;\n  if (type === \"text\") return body;\n  if (type === \"image\") return `${url} (${alt})`;\n  return type;\n}",
              description: "Destructures the union before narrowing, and interpolates the optional alt",
            },
          ],
        },
        "*Hint:* Avoid unpacking `body` before checking `d.type`.",
        "*Solution & Fix:* Destructuring before the check breaks the connection between `type` and `body`. In the first line, `body` has type `string | undefined`. Checking `type === 'text'` does not narrow the standalone variable `body`. Fix it by checking `if (d.type === 'text') return d.body;` directly on the object.",
        "**P3: The Extensible Event Log.** Design a discriminated union for user audit events (`login` with `userId`, `export` with `rowCount`). Add an exhaustive handler and explain what happens when a teammate adds a `logout` event tomorrow.",
        {
          type: "lab" as const,
          id: "lab-p3-discriminated-unions",
          title: "The Extensible Event Log",
          path: "fullstack/03-discriminated-unions",
          step: { current: 3, total: 3, title: "Practice Problem 3" },
          summary:
            "formatEvent handles the two known event types and returns an empty string for anything else, so a new event type disappears from the audit trail silently. The test asserts the new type reaches the exhaustive branch and is refused there.",
          command: "npm run test:p3",
          output:
            "✖ Problem 3: a new event type is a handled gap, not a silent empty line\n  AssertionError [ERR_ASSERTION]: Missing expected exception: Expected a new event type to be refused as unhandled, but the call returned \"\".\n\nℹ tests 3\nℹ pass 2\nℹ fail 1",
          files: [
            {
              path: "src/p3_event_log.ts",
              action: "modify" as const,
              language: "typescript",
              code: "/**\n * Format one audit-log event as a single line.\n */\nexport type LoginEvent = { type: \"login\"; userId: string };\nexport type ExportEvent = { type: \"export\"; rows: number };\nexport type AuditEvent = LoginEvent | ExportEvent;\n\nexport function formatEvent(event: AuditEvent): string {\n  if (event.type === \"login\") return `login user=${event.userId}`;\n  if (event.type === \"export\") return `export rows=${event.rows}`;\n  return \"\";\n}",
              description: "Returns an empty line instead of routing an unknown event to the exhaustive branch",
            },
          ],
        },
        "*Hint:* What does `assertNever(event)` do when a new member is added to `AuditEvent`?",
        "*Solution & Fix:* With an exhaustive `switch` ending in `default: return assertNever(event);`, adding `{ type: 'logout' }` immediately breaks the build on the default branch. The compiler refuses to build until you add a `case 'logout'` branch. It acts as an automatic checklist across your entire codebase.",
      ],
    },
  ],

  pullQuotes: [
    {
      quote: "Three booleans create eight states; a discriminated union only allows the ones that make sense in reality.",
    },
    {
      quote: "Checking the tag lets TypeScript throw the other boxes in the trash and safely open the lid.",
    },
    {
      quote: "Don't unpack your variables before checking the label on the outside of the box.",
    },
  ],
};
