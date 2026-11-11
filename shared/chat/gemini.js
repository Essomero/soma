// Gemini uses a different request and stream format. Translate both ways so
// every adapter speaks the same OpenAI-compatible SSE the frontend expects.

export function buildGeminiBody({ systemPrompt, userMessage }) {
  const body = {
    contents: [{ parts: [{ text: userMessage }], role: "user" }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  return body;
}

export function translateGeminiStream(source, modelId) {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        const out = [];
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            // Gemini 2.x and 3.x emit per-chunk deltas: each chunk's
            // parts[*].text is new text, not a cumulative total.
            const parts = parsed.candidates?.[0]?.content?.parts ?? [];
            const text = parts.map((p) => p.text ?? "").join("");
            if (text) {
              const chunk = JSON.stringify({
                id: "gemini-" + Date.now(),
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model: modelId,
                choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
              });
              out.push(`data: ${chunk}\n\n`);
            }
          } catch {}
        }

        if (out.length) {
          controller.enqueue(encoder.encode(out.join("")));
          return;
        }
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
