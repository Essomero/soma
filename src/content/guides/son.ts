export const son = {
  slug: "son",
  category: "Voice Agent // Oral Exams",
  title: "Son: answer the interview out loud",
  excerpt:
    "A local voice agent that speaks Soma's test questions and grades your spoken answers. Install once, start the server, talk.",
  image:
    "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1200&h=675&fit=crop",
  imageAlt: "Studio condenser microphone, podcast and audio production",
  author: { name: "Benjamin Mayanja", title: "Founder, Soma" },
  date: "October 2026",
  publishedAt: "2026-10-01T00:00:00Z",
  tags: ["Son", "Voice Agent", "Oral Exams", "Local-First"],
  intro:
    "Writing the right answer and saying it under pressure are different skills, and interviews test the second one. Son is a real-time voice agent that runs on your own machine: it reads Soma's diagnostic questions aloud, hears your spoken answer, and scores it. No cloud meeting, no human examiner, no audio leaving your desk unless you choose it.",
  body: [
    "## The idea: typing is not talking",

    "Soma's tests already grade written answers. Son adds the missing half: the question arrives as speech, you answer as speech, and the score reflects what you can explain, not just what you can type. It runs fully standalone: Soma can use it as an oral exam voice, but neither repo depends on the other. [Son on GitHub](https://github.com/Essomero/son) is the whole machine.",

    "## Step 1: check the prerequisites",

    "Son is local-first, so the requirements are about your machine, not a billing page. You need macOS or Linux, Python 3.11+ with [uv](https://docs.astral.sh/uv/), Node 20.19+ for the client bundle, and a free Groq key for the brain. No GPU: everything runs on CPU, and the downloads below cache on disk the first time.",

    "> Default path downloads only the voice files. The heavy models are all optional, and raw transcripts work without them.",

    "## Step 2: install",

    "Four commands. The CLI symlinks itself onto your PATH, so installing is really wiring: safe to rerun any time.",

    "```bash\nuv sync                            # bot dependencies\ncp .env.example .env              # then set GROQ_API_KEY inside\n./scripts/son install              # links son onto ~/.local/bin\nson build                          # client bundle, roles, extension\n```\n\nIf `son` is not found afterwards, `~/.local/bin` is not on your PATH yet. Export it once and restart your shell. `son doctor` runs preflight whenever something feels off: versions, keys, ports, caches.",

    "## Step 3: start it and talk",

    "One command brings up the server that matters. Open the page, pick a role, hit Start talking.",

    "```bash\nson start server     # the bot: UI, sessions, and realtime on :7860\nson status           # ports, logs, keys, caches at a glance\nson stop             # everything down\n```\n\nOpen `http://localhost:7860` and talk. First launch downloads the Kokoro voice files (about 354 MB, cached after that). Speech recognition defaults to your browser, so nothing extra runs; pick Parakeet in settings to keep speech fully off the network. The voice you hear is synthesized on your machine either way.",

    "## Step 4: connect it to Soma",

    "With the server running, open any Soma diagnostic test. The questions arrive spoken, you answer aloud, and grading works the same as the written path. If Son is unreachable, tests fall back to silent text mode: nothing breaks, the voice is strictly an upgrade. Conversations persist locally and can be resumed later.",

    "## What it costs your machine",

    "Honest numbers, all one-time and all cached. Kokoro voices cost about 354 MB for spoken replies. Everything else is opt-in: the cleanup model is 462 MB, offline speech-to-text up to 660 MB, and each holds around half to one gigabyte of RAM only while in use. Start with the default path and add pieces when you feel a specific lack, not before.",
  ],

  bentoHighlights: [
    {
      label: "LOCAL FIRST",
      title: "Your voice stays yours",
      description:
        "Speech-to-text and synthesis run on your machine by default. No audio pipeline through someone else's cloud unless you pick it.",
    },
    {
      label: "ONE COMMAND",
      title: "son start server",
      description:
        "The UI, the sessions, and the realtime endpoints all come from one server on port 7860. Status, logs, and stop are one word each.",
    },
    {
      label: "ORAL EXAMS",
      title: "Soma tests, spoken",
      description:
        "With Son running, diagnostic questions arrive as speech and your spoken answers get graded. Unreachable means silent text, never broken.",
    },
  ],

  pullQuotes: [
    {
      quote:
        "Writing the right answer and saying it under pressure are different skills, and interviews test the second one.",
    },
    {
      quote:
        "Start with the default path and add pieces when you feel a specific lack, not before.",
    },
    {
      quote:
        "If Son is unreachable, tests fall back to silent text mode: nothing breaks, the voice is strictly an upgrade.",
    },
  ],

  references: [
    {
      title: "Son on GitHub",
      url: "https://github.com/Essomero/son",
      description: "Personal real-time voice agent. Local speech, barge-in, oral exams for Soma tests.",
    },
  ],
};
