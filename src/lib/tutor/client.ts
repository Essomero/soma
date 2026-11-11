import type { TutorMode } from "../../../shared/tutor/modes.js";

export interface TutorContext {
  selectedText?: string;
  articleTitle?: string;
  articleExcerpt?: string;
  articleBody?: string;
  commentBody?: string;
  highlightedText?: string;
  threadContext?: string;
  sectionIndex?: number;
  paragraphIndex?: number;
  priorTurns?: { mode: TutorMode; body: string }[];
}

export interface StreamChatOptions {
  action: "tutor" | "article-explain" | "article-summary" | "comment-reply" | "highlight-reply";
  mode?: TutorMode;
  context: TutorContext;
  model: string;
  provider?: string;
  signal?: AbortSignal;
  onToken: (fullText: string) => void;
  /** Called with accumulated reasoning/thinking content as it streams in. */
  onReasoningToken?: (fullReasoning: string) => void;
}

async function readError(response: Response): Promise<string> {
  let message = `AI service error (HTTP ${response.status})`;
  try {
    const data = await response.json();
    if (data && typeof data.error === "string") message = data.error;
  } catch {}
  return message;
}

export async function streamChat(options: StreamChatOptions): Promise<string> {
  const { action, mode, context, model, provider, signal, onToken, onReasoningToken } = options;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      ...(mode ? { mode } : {}),
      context,
      model,
      provider,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) throw new Error(await readError(response));

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let fullReasoning = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed.choices?.[0]?.delta;
        // reasoning_content (DeepSeek, some providers)
        const rc = delta?.reasoning_content || "";
        // reasoning_details (OpenRouter streaming shape)
        const rd = delta?.reasoning_details;
        let reasoningDelta = rc;
        if (rd && Array.isArray(rd)) {
          reasoningDelta = rd.map((r: unknown) => {
            if (r && typeof r === "object" && "text" in r) {
              const t = (r as Record<string, unknown>).text;
              return typeof t === "string" ? t : "";
            }
            return "";
          }).join("");
        }
        if (reasoningDelta && onReasoningToken) {
          fullReasoning += reasoningDelta;
          onReasoningToken(fullReasoning);
        }
        const token = delta?.content || "";
        if (token) {
          full += token;
          onToken(full);
        }
      } catch {}
    }
  }

  return full;
}
