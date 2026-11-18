# Search anything. Learn it. Prove it.

I'm Benjamin Mayanja. I built [Soma](https://soma.mayanja.dev).

Here's the thing. I want to understand WebSocket backpressure. I ask ChatGPT. It gives me a wall of text with bullet points. I read it, nod, and forget half of it by next week.

If I want to check whether I actually understood it, I'm on my own. No diagram. No way to interact with the explanation. No test to verify. Just a chat log I'll never look at again.

---

## Two formats for two different things

ChatGPT is for getting answers. You ask, it replies, you move on. Fast, useful, ephemeral.

Soma is for learning. The format is different for a reason.

Every new message in a chat pushes the previous explanation further up. You scroll to find that one paragraph that made it click. You can't. You branch the conversation to keep it. Now you have two threads and no way to merge them. Even if you save the chat, sharing it means the other person reads a messy log with half finished thoughts and "can you explain that again?" messages.

Chat is built for conversation. It's great for that. It's terrible as a container for knowledge.

Soma uses a page format. Search anything, you get a page with sections, Mermaid diagrams, KaTeX math, code blocks, callouts. A page stays a page. You don't scroll through 40 messages to find the part about backpressure strategies. You click the section heading.

Highlight any paragraph and the margin AI explains it, challenges it, or simplifies it. Drop a 3D scene where a picture won't do. When you think you've got it, one click generates a test. Multiple choice, written, or oral. Checks whether you actually understood the topic, not whether you can spot a paragraph you read five minutes ago.

You use ChatGPT when you need a quick answer. You use Soma when you want it to stick. They're different tools.

---

## For the technical reader: your agents already know how to use it

Clone the repo. Open it in Claude Code, Cursor, or any coding agent. The bundled skill files and MCP server tell your agents exactly how to create, validate, and publish content. No setup, no config.

Agents are more powerful than any browser interface. They read your existing notes, reference your codebase, chain complex operations. The browser AI is a margin tutor. Your coding agent is a full publishing partner.

---

## What it is not

- Not a ChatGPT replacement. ChatGPT gives you answers. Soma helps you learn them.
- Not a notes app. You can write notes, but the goal is understanding, not filing.
- Not a blog platform. You can publish, but the audience is optional.

---

## How it works

Three repos, one loop.

**Soma** is where you learn. Search anything, get a rich page. Highlight anything, the margin AI tutors you. One click generates a test. Fork the repo, run `docker compose up`, add one password. Your data stays in your database.

**Soma Labs** is where you drill it. Each lesson links to a real exercise: a failing test, a function you write, a green check when it passes. Reading about generics is easy. Writing them until the test passes is the part that sticks.

**Son** is a voice agent for oral exams. It reads questions aloud, listens to your answer, evaluates it. No proprietary cloud. Runs locally at `localhost:7860`.

Read it in Soma. Drill it in Soma Labs. Explain it to Son. When all three feel easy, you know it.

---

## Try it

[soma.mayanja.dev](https://soma.mayanja.dev). Search anything. Read it like a book. Test yourself when you're ready.

Docker: `docker compose up --build` with one env var (`SITE_PASSWORD`). 60 seconds.

The source: [github.com/Essomero/soma](https://github.com/Essomero/soma)

Benjamin Mayanja