import test from "node:test";
import assert from "node:assert/strict";

import { runChat } from "./core.js";
import { isReasoningModel, normalizeModel, resolveProvider } from "./providers.js";

function captureFetch(responseFactory) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null });
    return responseFactory(url, init);
  };
  fn.calls = calls;
  return fn;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sseResponse(chunks) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream" } },
  );
}

async function readAll(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

test("resolveProvider follows explicit provider, straitly ids, gemini prefix, slash, default", () => {
  assert.equal(resolveProvider({ provider: "groq", model: "gemini-2.5-flash" }), "groq");
  assert.equal(resolveProvider({ model: "deepseek/deepseek-v4-1-flash" }), "straitly");
  assert.equal(resolveProvider({ model: "gemini-2.5-flash" }), "gemini");
  assert.equal(resolveProvider({ model: "google/gemini-2.5-flash" }), "openrouter");
  assert.equal(resolveProvider({ model: "deepseek-flash" }), "deepseek");
  assert.equal(resolveProvider({}), "deepseek");
});

test("normalizeModel strips gateway prefixes and maps OpenRouter aliases", () => {
  assert.equal(normalizeModel("straitly", "straitly/deepseek/deepseek-v4-1-flash"), "deepseek/deepseek-v4-1-flash");
  assert.equal(normalizeModel("openrouter", "google/gemini-flash-latest"), "google/gemini-2.5-flash");
  assert.equal(normalizeModel("openrouter", "~google/gemini-pro-latest"), "google/gemini-2.5-pro");
  assert.equal(normalizeModel("openrouter", "meta-llama/llama-3.3-70b-instruct:free"), "meta-llama/llama-3.3-70b-instruct");
  assert.equal(normalizeModel("deepseek", undefined), "deepseek-flash");
});

test("isReasoningModel detects DeepSeek V4 and GLM ids", () => {
  assert.equal(isReasoningModel("deepseek-v4-pro"), true);
  assert.equal(isReasoningModel("deepseek/deepseek-v4-flash"), true);
  assert.equal(isReasoningModel("z-ai/glm-5.3-flash"), true);
  assert.equal(isReasoningModel("deepseek-flash"), false);
});

test("validates the request before touching a provider", async () => {
  const fetchImpl = captureFetch(() => jsonResponse({}));
  assert.deepEqual(await runChat({ body: {}, keys: {}, fetchImpl }), {
    kind: "error",
    status: 400,
    body: { error: "userMessage is required" },
  });
  assert.equal(fetchImpl.calls.length, 0);
});

test("rejects unknown providers and missing keys", async () => {
  const fetchImpl = captureFetch(() => jsonResponse({}));
  const unknown = await runChat({
    body: { userMessage: "hi", provider: "custom" },
    keys: {},
    fetchImpl,
  });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.error, "unknown provider");

  const missing = await runChat({
    body: { userMessage: "hi", model: "deepseek-flash" },
    keys: {},
    fetchImpl,
  });
  assert.equal(missing.status, 500);
  assert.match(missing.body.error, /DEEPSEEK_API_KEY/);
});

test("honors the Gemini kill switch", async () => {
  const result = await runChat({
    body: { userMessage: "hi", model: "gemini-2.5-flash" },
    keys: { gemini: "key" },
    options: { geminiDisabled: true },
    fetchImpl: captureFetch(() => jsonResponse({})),
  });
  assert.equal(result.status, 503);
});

test("non-stream request returns reply and clamps default tokens", async () => {
  const fetchImpl = captureFetch(() => jsonResponse({ choices: [{ message: { content: "hello back" } }] }));
  const result = await runChat({
    body: { userMessage: "hi", model: "deepseek-flash", stream: false },
    keys: { deepseek: "key" },
    fetchImpl,
  });

  assert.equal(result.kind, "json");
  assert.equal(result.body.reply, "hello back");
  assert.equal(fetchImpl.calls.length, 1);
  assert.equal(fetchImpl.calls[0].url, "https://api.deepseek.com/v1/chat/completions");
  assert.equal(fetchImpl.calls[0].body.max_tokens, 3500);
  assert.equal(fetchImpl.calls[0].body.thinking, undefined);
});

test("reasoning models get the large budget and thinking flag", async () => {
  const fetchImpl = captureFetch(() => jsonResponse({ choices: [{ message: { content: "ok" } }] }));
  await runChat({
    body: { userMessage: "hi", model: "deepseek-v4-pro", stream: false },
    keys: { deepseek: "key" },
    options: { reasoningEffort: "medium" },
    fetchImpl,
  });

  assert.equal(fetchImpl.calls[0].body.max_tokens, 64000);
  assert.deepEqual(fetchImpl.calls[0].body.thinking, { type: "enabled" });
  assert.equal(fetchImpl.calls[0].body.reasoning_effort, "medium");
});

test("messages array is accepted as a fallback", async () => {
  const fetchImpl = captureFetch(() => jsonResponse({ choices: [{ message: { content: "ok" } }] }));
  await runChat({
    body: {
      model: "deepseek-flash",
      stream: false,
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "usr" },
      ],
    },
    keys: { deepseek: "key" },
    fetchImpl,
  });

  assert.deepEqual(fetchImpl.calls[0].body.messages, [
    { role: "system", content: "sys" },
    { role: "user", content: "usr" },
  ]);
});

test("provider errors are normalized", async () => {
  const fetchImpl = captureFetch(() =>
    jsonResponse({ error: { message: "quota exceeded" } }, 429),
  );
  const result = await runChat({
    body: { userMessage: "hi", model: "deepseek-flash", stream: false },
    keys: { deepseek: "key" },
    fetchImpl,
  });
  assert.equal(result.status, 502);
  assert.equal(result.body.error, "quota exceeded");
});

test("Gemini stream is translated to OpenAI SSE", async () => {
  const fetchImpl = captureFetch(() =>
    sseResponse([
      'data: {"candidates":[{"content":{"parts":[{"text":"Hello "}]}}]}\n\n',
      'data: {"candidates":[{"content":{"parts":[{"text":"world"}]}}]}\n\n',
    ]),
  );

  const result = await runChat({
    body: { userMessage: "hi", model: "gemini-2.5-flash", stream: true },
    keys: { gemini: "key" },
    fetchImpl,
  });

  assert.equal(result.kind, "stream");
  assert.equal(fetchImpl.calls[0].url.includes(":streamGenerateContent?alt=sse"), true);
  assert.equal(fetchImpl.calls[0].init.headers["X-goog-api-key"], "key");

  const text = await readAll(result.stream);
  assert.match(text, /"content":"Hello "/);
  assert.match(text, /"content":"world"/);
  assert.match(text, /data: \[DONE\]/);
});
