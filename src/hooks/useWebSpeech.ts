/**
 * Browser-side speech-to-text using Chrome's Web Speech API (webkitSpeechRecognition).
 * Transcriptions are delivered as interim and final text events directly to the UI;
 * no audio is transmitted across the network.
 * Reference: useWebSpeech.ts in Son client.
 */

import { useEffect, useRef, useState } from "react";

export type SpeechResultHandler = (text: string, isFinal: boolean) => void;

function getSpeechRecognitionCtor(): any | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Check if Web Speech API is supported in the current browser (Chrome / Edge / Safari). */
export function isWebSpeechSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export interface UseWebSpeechOptions {
  enabled: boolean;
  onResult: SpeechResultHandler;
  onSoundChange?: (active: boolean) => void;
  onError?: (errorCode: string) => void;
  lang?: string;
}

export interface WebSpeechState {
  /** Whether the recognizer is actively listening. */
  isRecognizing: boolean;
  /** Whether audio input (sound) is currently being detected by the recognizer. */
  soundActive: boolean;
  /** The latest interim (non-final) transcription text. Clears when the utterance becomes final. */
  interimText: string;
}

export function useWebSpeech({
  enabled,
  onResult,
  onSoundChange,
  onError,
  lang = "en-US",
}: UseWebSpeechOptions): WebSpeechState {
  const handlerRef = useRef(onResult);
  handlerRef.current = onResult;
  const soundRef = useRef(onSoundChange);
  soundRef.current = onSoundChange;
  const errorRef = useRef(onError);
  errorRef.current = onError;

  const [isRecognizing, setIsRecognizing] = useState(false);
  const [soundActive, setSoundActive] = useState(false);
  const [interimText, setInterimText] = useState("");

  useEffect(() => {
    if (!enabled) {
      setIsRecognizing(false);
      setSoundActive(false);
      setInterimText("");
      return;
    }

    const SR = getSpeechRecognitionCtor();
    if (!SR) {
      onError?.("not-supported");
      return;
    }

    let rec: any;
    try {
      rec = new SR();
    } catch {
      onError?.("start-failed");
      return;
    }

    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const r = event.results[i];
        if (r?.[0]?.transcript) {
          const transcript = r[0].transcript;
          const isFinal = Boolean(r.isFinal);

          // Track interim text for live preview
          if (isFinal) {
            setInterimText("");
          } else {
            setInterimText(transcript);
          }

          handlerRef.current(transcript, isFinal);
        }
      }
    };

    rec.onsoundstart = () => {
      setSoundActive(true);
      soundRef.current?.(true);
    };

    rec.onsoundend = () => {
      setSoundActive(false);
      soundRef.current?.(false);
    };

    rec.onstart = () => {
      setIsRecognizing(true);
    };

    rec.onerror = (event: any) => {
      const reason: string = event?.error || "unknown";
      errorRef.current?.(reason);
      if (reason === "not-allowed" || reason === "service-not-allowed") {
        rec.stop();
      }
    };

    let restarting = true;
    let restartTimer: number | undefined;

    rec.onend = () => {
      setIsRecognizing(false);
      setSoundActive(false);
      soundRef.current?.(false);
      if (!restarting) return;
      restartTimer = window.setTimeout(() => {
        restartTimer = undefined;
        if (!restarting) return;
        try {
          rec.start();
        } catch {
          // Engine might still be in transition
        }
      }, 300);
    };

    try {
      rec.start();
    } catch (e) {
      console.warn("[WebSpeech] Failed to start:", e);
    }

    return () => {
      restarting = false;
      clearTimeout(restartTimer);
      try {
        rec.stop();
      } catch {
        // Already stopped
      }
      setIsRecognizing(false);
      setSoundActive(false);
      setInterimText("");
      soundRef.current?.(false);
    };
  }, [enabled, lang, onError]);

  return { isRecognizing, soundActive, interimText };
}