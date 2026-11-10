export interface ChatJsonResult {
  kind: "json";
  status: number;
  body: unknown;
}

export interface ChatErrorResult {
  kind: "error";
  status: number;
  body: { error: string };
}

export interface ChatStreamResult {
  kind: "stream";
  status: number;
  headers: Record<string, string>;
  stream: ReadableStream<Uint8Array>;
}

export type ChatResult = ChatJsonResult | ChatErrorResult | ChatStreamResult;

export interface ChatOptions {
  geminiDisabled?: boolean;
  reasoningEffort?: string;
  referer?: string;
  title?: string;
  requestTimeoutMs?: number;
}

export function runChat(args?: {
  body?: unknown;
  keys?: Record<string, string>;
  options?: ChatOptions;
  fetchImpl?: typeof fetch;
}): Promise<ChatResult>;
