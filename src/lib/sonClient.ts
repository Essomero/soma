/**
 * Client library for interacting with the Son real-time voice agent backend.
 * Provides endpoint resolution, availability probes, speech-friendly text cleaning,
 * and one-shot Kokoro TTS synthesis with the default Michael voice ("am_michael").
 */

const LOCALSTORAGE_KEY = "son_backend_url";
const VOICE_STORAGE_KEY = "son_kokoro_voice";
const DEFAULT_SON_URL = "http://localhost:7860";
export const DEFAULT_VOICE_ID = "am_michael";
export const DEFAULT_VOICE_PROVIDER = "kokoro";

export interface KokoroVoiceOption {
  id: string; // e.g. "am_michael"
  name: string; // e.g. "Michael"
  accent: "American" | "British";
  gender: "Male" | "Female";
  flag: string; // "🇺🇸" | "🇬🇧"
  label: string;
}

export const KOKORO_VOICES: KokoroVoiceOption[] = [
  // American Male (Michael default first)
  { id: "am_michael", name: "Michael", accent: "American", gender: "Male", flag: "🇺🇸", label: "Michael · American Male (Default)" },
  { id: "am_adam", name: "Adam", accent: "American", gender: "Male", flag: "🇺🇸", label: "Adam · American Male" },
  { id: "am_echo", name: "Echo", accent: "American", gender: "Male", flag: "🇺🇸", label: "Echo · American Male" },
  { id: "am_eric", name: "Eric", accent: "American", gender: "Male", flag: "🇺🇸", label: "Eric · American Male" },
  { id: "am_liam", name: "Liam", accent: "American", gender: "Male", flag: "🇺🇸", label: "Liam · American Male" },
  { id: "am_onyx", name: "Onyx", accent: "American", gender: "Male", flag: "🇺🇸", label: "Onyx · American Male" },
  { id: "am_fenrir", name: "Fenrir", accent: "American", gender: "Male", flag: "🇺🇸", label: "Fenrir · American Male" },
  { id: "am_puck", name: "Puck", accent: "American", gender: "Male", flag: "🇺🇸", label: "Puck · American Male" },

  // American Female
  { id: "af_heart", name: "Heart", accent: "American", gender: "Female", flag: "🇺🇸", label: "Heart · American Female" },
  { id: "af_bella", name: "Bella", accent: "American", gender: "Female", flag: "🇺🇸", label: "Bella · American Female" },
  { id: "af_sarah", name: "Sarah", accent: "American", gender: "Female", flag: "🇺🇸", label: "Sarah · American Female" },
  { id: "af_nicole", name: "Nicole", accent: "American", gender: "Female", flag: "🇺🇸", label: "Nicole · American Female" },
  { id: "af_sky", name: "Sky", accent: "American", gender: "Female", flag: "🇺🇸", label: "Sky · American Female" },
  { id: "af_alloy", name: "Alloy", accent: "American", gender: "Female", flag: "🇺🇸", label: "Alloy · American Female" },
  { id: "af_jessica", name: "Jessica", accent: "American", gender: "Female", flag: "🇺🇸", label: "Jessica · American Female" },
  { id: "af_river", name: "River", accent: "American", gender: "Female", flag: "🇺🇸", label: "River · American Female" },

  // British Male
  { id: "bm_george", name: "George", accent: "British", gender: "Male", flag: "🇬🇧", label: "George · British Male" },
  { id: "bm_daniel", name: "Daniel", accent: "British", gender: "Male", flag: "🇬🇧", label: "Daniel · British Male" },
  { id: "bm_fable", name: "Fable", accent: "British", gender: "Male", flag: "🇬🇧", label: "Fable · British Male" },
  { id: "bm_lewis", name: "Lewis", accent: "British", gender: "Male", flag: "🇬🇧", label: "Lewis · British Male" },

  // British Female
  { id: "bf_alice", name: "Alice", accent: "British", gender: "Female", flag: "🇬🇧", label: "Alice · British Female" },
  { id: "bf_emma", name: "Emma", accent: "British", gender: "Female", flag: "🇬🇧", label: "Emma · British Female" },
  { id: "bf_isabella", name: "Isabella", accent: "British", gender: "Female", flag: "🇬🇧", label: "Isabella · British Female" },
  { id: "bf_lily", name: "Lily", accent: "British", gender: "Female", flag: "🇬🇧", label: "Lily · British Female" },
];

export function getSelectedKokoroVoice(): KokoroVoiceOption {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(VOICE_STORAGE_KEY);
    if (saved) {
      const match = KOKORO_VOICES.find((v) => v.id === saved);
      if (match) return match;
    }
  }
  return KOKORO_VOICES[0];
}

export function setSelectedKokoroVoice(voiceId: string): void {
  if (typeof window === "undefined") return;
  const match = KOKORO_VOICES.find((v) => v.id === voiceId);
  if (match) {
    localStorage.setItem(VOICE_STORAGE_KEY, match.id);
  }
}
/**
 * Resolves the Son backend base URL:
 * 1. User override stored in localStorage
 * 2. Vite environment variable: VITE_SON_BACKEND_URL or VITE_SON_URL
 * 3. Default fallback: http://localhost:7860
 */
export function getSonBackendUrl(): string {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem(LOCALSTORAGE_KEY);
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
  }
  const envUrl =
    (import.meta.env.VITE_SON_BACKEND_URL as string | undefined) ||
    (import.meta.env.VITE_SON_URL as string | undefined);
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  return DEFAULT_SON_URL;
}

export function setSonBackendUrl(url: string | null): void {
  if (typeof window === "undefined") return;
  if (!url || !url.trim() || url.trim() === DEFAULT_SON_URL) {
    localStorage.removeItem(LOCALSTORAGE_KEY);
  } else {
    localStorage.setItem(LOCALSTORAGE_KEY, url.trim().replace(/\/+$/, ""));
  }
}

export interface SonStatus {
  available: boolean;
  url: string;
  error?: string;
  warming?: Record<string, string>;
}

/**
 * Checks if the Son backend is reachable and ready to synthesize audio.
 * Probes /warming first (instant in-memory check), falls back to /models.
 */
export async function checkSonAvailability(overrideUrl?: string): Promise<SonStatus> {
  const url = overrideUrl ? overrideUrl.trim().replace(/\/+$/, "") : getSonBackendUrl();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${url}/warming`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { available: true, url, warming: data.warming };
    }

    // Secondary probe to /models
    const ctrl2 = new AbortController();
    const timeout2 = setTimeout(() => ctrl2.abort(), 2000);
    const res2 = await fetch(`${url}/models`, {
      method: "GET",
      signal: ctrl2.signal,
    });
    clearTimeout(timeout2);

    if (res2.ok) {
      return { available: true, url };
    }

    return {
      available: false,
      url,
      error: `Server responded with status ${res.status}`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return {
      available: false,
      url,
      error: message.includes("abort") ? "Connection timed out" : message,
    };
  }
}

/**
 * Strips markdown, code blocks, LaTeX equations, and formatting noise
 * so the text reads naturally and fluidly through TTS.
 * Reference: clean.ts in Son client.
 */
export function cleanForSpeech(raw: string): string {
  if (!raw) return "";
  let t = raw.replace(/\r\n?/g, "\n");

  // Fenced code blocks (``` ... ``` or ~~~ ... ~~~) : unreadable aloud
  t = t.replace(/```[^\n`]*\n[\s\S]*?```/g, "\n");
  t = t.replace(/~~~[^\n~]*\n[\s\S]*?~~~/g, "\n");

  // Indented code blocks: consecutive 4-space lines
  t = t.replace(/^(?: {4}|\t).*\n(?:(?: {4}|\t).*\n?)+/gm, "");

  // Block math ($$ ... $$, \[ ... \]) and LaTeX delimiters
  t = t.replace(/\$\$[\s\S]*?\$\$/g, "\n");
  t = t.replace(/\\\[[\s\S]*?\\\]/g, "\n");
  t = t.replace(/\\\([^)\n]*\\\)/g, "");

  // Inline math $ ... $: strip equation span
  t = t.replace(/\$[^$\n]*\$/g, "");
  t = t.replace(/\$(?!\d)/g, "");

  // Images dropped, links keep their label, autolinks dropped
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  t = t.replace(/<https?:\/\/[^>\s]+>/gi, "");

  // Inline code: backticks stripped, word kept
  t = t.replace(/`([^`\n]+)`/g, "$1");

  // Headings: strip hashes, keep heading text
  t = t.replace(/^#{1,6}\s+/gm, "");

  // Lists: strip bullets and numbered prefixes
  t = t.replace(/^\s*([-*+]|\d+[.)])\s+/gm, "");

  // Blockquotes: strip > prefix
  t = t.replace(/^>\s?/gm, "");

  // Horizontal rules
  t = t.replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, "");

  // Tables: remove consecutive pipe rows
  t = t.replace(/^\|.*(?:\n\|.*)*$/gm, "");

  // Emphasis, bold and strikethrough: collapse markers
  for (let i = 0; i < 3; i++) {
    const before = t;
    t = t.replace(/(\*\*\*|___)([^*_]+)\1/g, "$2");
    t = t.replace(/(\*\*|__)([^*_]+)\1/g, "$2");
    t = t.replace(/(\*|_)([^*_]+)\1/g, "$2");
    if (t === before) break;
  }

  // Escapes: stray backslashes
  t = t.replace(/\\/g, "");

  // Whitespace tidy
  t = t.replace(/[ \t]+$/gm, "");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

export interface SpeakOptions {
  text: string;
  voiceId?: string; // default "am_michael"
  provider?: string; // default "kokoro"
  signal?: AbortSignal;
}

/**
 * Canonical cache key for a question's prompt audio.
 * MUST be used by both the prefetcher and the player: two key schemes that differ
 * by one suffix mean the prefetch lands in a slot nobody ever reads.
 */
export function questionAudioCacheKey(
  questionId: string,
  voiceId: string = DEFAULT_VOICE_ID,
): string {
  return `${questionId}_${voiceId}`;
}

/**
 * In-memory audio cache for instant zero-latency playback.
 * Stores synthesized audio blob URLs keyed by questionAudioCacheKey.
 */
const audioCache = new Map<string, string>();
const activeFetches = new Map<string, Promise<string | null>>();

export function getCachedAudioUrl(key: string): string | undefined {
  return audioCache.get(key);
}

export function setCachedAudioUrl(key: string, url: string): void {
  audioCache.set(key, url);
}

export function clearAudioCache(): void {
  for (const url of audioCache.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
  audioCache.clear();
  activeFetches.clear();
}

/**
 * Prefetches audio in the background (e.g. Q1 on the landing page, Q2 while on Q1).
 * Deduplicates in-flight fetches so parallel calls share the same synthesis request,
 * and keys the cache with questionAudioCacheKey so playback hits the warm entry.
 * Returns null when synthesis fails or is aborted; never throws.
 */
export async function prefetchQuestionAudio(
  questionId: string,
  text: string,
  title?: string,
  voiceId = DEFAULT_VOICE_ID,
  provider = DEFAULT_VOICE_PROVIDER,
  signal?: AbortSignal,
): Promise<string | null> {
  const key = questionAudioCacheKey(questionId, voiceId);
  if (audioCache.has(key)) {
    return audioCache.get(key)!;
  }
  if (activeFetches.has(key)) {
    return activeFetches.get(key)!;
  }

  const script = title ? `${title}. ${text}` : text;
  const cleaned = cleanForSpeech(script);
  if (!cleaned) return null;

  const promise = (async () => {
    try {
      const url = await synthesizeSpeechWithSon({
        text: cleaned,
        voiceId,
        provider,
        signal,
      });
      audioCache.set(key, url);
      return url;
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        console.warn(`[Son Audio] Prefetch failed for ${key}:`, err);
      }
      return null;
    } finally {
      activeFetches.delete(key);
    }
  })();

  activeFetches.set(key, promise);
  return promise;
}

/**
 * Synthesizes text to a WAV audio Blob URL via Son's POST /speak endpoint.
 * Defaults to Kokoro with voice "am_michael".
 */
export async function synthesizeSpeechWithSon(options: SpeakOptions): Promise<string> {
  const cleaned = cleanForSpeech(options.text);
  if (!cleaned) {
    throw new Error("No readable text to synthesize.");
  }

  const backendUrl = getSonBackendUrl();
  const provider = options.provider || DEFAULT_VOICE_PROVIDER;
  const voiceId = options.voiceId || DEFAULT_VOICE_ID;

  const res = await fetch(`${backendUrl}/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: cleaned,
      voice: {
        provider,
        id: voiceId,
      },
    }),
    signal: options.signal,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(
      `Speech synthesis failed (HTTP ${res.status}): ${errorBody || res.statusText}`,
    );
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
