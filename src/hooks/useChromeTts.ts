/**
 * Browser-side Text-to-Speech using the native Web Speech API (speechSynthesis).
 * Fully offline, no network requests. Falls back to nothing when unsupported.
 *
 * Availability check is a plain function so consumers can gate UI before
 * mounting the hook: `isChromeTtsSupported()`.
 */

import { useEffect, useRef, useState, useCallback } from "react";

// ── Standalone availability check ─────────────────────

export function isChromeTtsSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
}

// ── Hook ──────────────────────────────────────────────

export interface ChromeTtsState {
  /** Whether speechSynthesis is available in this browser. */
  available: boolean;
  /** Whether speech is currently being spoken. */
  speaking: boolean;
  /** Whether speech is paused (mid-utterance). */
  paused: boolean;
  /** All voices the browser exposes. */
  voices: SpeechSynthesisVoice[];
  /** Currently selected voice (defaults to first en local-service voice). */
  selectedVoice: SpeechSynthesisVoice | null;
  /** Speak a string. Stops any current utterance first. */
  start: (text: string) => void;
  /** Stop speaking and reset. */
  stop: () => void;
  /** Pause mid-utterance. */
  pause: () => void;
  /** Resume a paused utterance. */
  resume: () => void;
  /** Switch the active voice. */
  setVoice: (voice: SpeechSynthesisVoice) => void;
}

export function useChromeTts(): ChromeTtsState {
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const [ready, setReady] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Init synth + populate voice list
  useEffect(() => {
    if (!isChromeTtsSupported()) return;

    const synth = window.speechSynthesis;
    synthRef.current = synth;

    // Chrome loads voices asynchronously; the getVoices() initial call may be
    // empty, then onvoiceschanged fires with the real list.
    const loadVoices = () => {
      const list = synth.getVoices();
      setVoices(list);
      if (!voiceRef.current && list.length > 0) {
        const preferred =
          list.find((v) => v.lang.startsWith("en") && v.localService) ?? list[0];
        voiceRef.current = preferred;
        setSelectedVoice(preferred);
      }
    };

    loadVoices();
    synth.onvoiceschanged = loadVoices;
    setReady(true);

    return () => {
      synth.cancel();
      synth.onvoiceschanged = null;
    };
  }, []);

  const start = useCallback((text: string) => {
    const synth = synthRef.current;
    if (!synth) return;

    synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = voiceRef.current ?? null;
    utter.rate = 1;
    utter.pitch = 1;
    utter.volume = 1;

    utter.onstart = () => { setSpeaking(true); setPaused(false); };
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    utter.onpause = () => setPaused(true);
    utter.onresume = () => setPaused(false);

    utterRef.current = utter;
    synth.speak(utter);
  }, []);

  const stop = useCallback(() => {
    synthRef.current?.cancel();
    setSpeaking(false);
    setPaused(false);
  }, []);

  const pause = useCallback(() => {
    synthRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    synthRef.current?.resume();
  }, []);

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    voiceRef.current = voice;
    setSelectedVoice(voice);
  }, []);

  return {
    available: ready && isChromeTtsSupported(),
    speaking,
    paused,
    voices,
    selectedVoice,
    start,
    stop,
    pause,
    resume,
    setVoice,
  };
}