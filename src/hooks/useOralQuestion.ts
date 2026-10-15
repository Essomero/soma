/**
 * Unified state controller for oral test questions.
 * Manages the synchronized state machine between:
 * 1. Examiner audio playback (Michael via Kokoro TTS)
 * 2. Answering response countdown timer
 * 3. Chrome Web Speech microphone recording
 *
 * Invariants enforced:
 * - Audio and mic NEVER overlap (prevents speaker acoustic echo into speech recognition)
 * - Timer waits during prompt reading (candidate never loses answer time)
 * - Mic automatically activates the moment examiner finishes speaking
 * - Candidate interaction (typing, clicking mic, clicking Start) immediately hands off to answering
 * - Audio NEVER plays on the landing page (only active when enabled === true)
 * - Pauses between speech NEVER replace text; speech chunks accumulate continuously via answerRef
 * - Audio is STRICTLY isolated per questionId: moving to Question 2 immediately terminates and
 *   discards Question 1's audio element, preventing previous question replay bugs.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  prefetchQuestionAudio,
  getCachedAudioUrl,
  questionAudioCacheKey,
  DEFAULT_VOICE_ID,
} from "@/lib/sonClient";
import { isWebSpeechSupported } from "@/hooks/useWebSpeech";

export type OralPhase = "listening" | "answering";

export interface UseOralQuestionOptions {
  questionId: string;
  text: string;
  title?: string;
  examinerName?: string;
  voiceId?: string; // defaults to "am_michael"
  currentAnswer: string;
  onAnswerChange: (newAnswer: string) => void;
  isOralMode: boolean;
  sonAvailable: boolean;
  enabled?: boolean; // false when on intro or review/eval pages
  autoPlay?: boolean;
  onPhaseChange?: (phase: OralPhase) => void;
}

function appendSpeechText(existing: string, addition: string): string {
  if (!existing) return addition.replace(/^\s+/, "");
  if (!addition) return existing;
  const needsSpace = !/\s$/.test(existing) && !/^\s/.test(addition);
  return needsSpace ? `${existing} ${addition}` : `${existing}${addition}`;
}

function getSpeechRecognitionCtor(): any | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useOralQuestion({
  questionId,
  text,
  title,
  voiceId = DEFAULT_VOICE_ID,
  currentAnswer,
  onAnswerChange,
  isOralMode,
  sonAvailable,
  enabled = true,
  autoPlay = true,
  onPhaseChange,
}: UseOralQuestionOptions) {
  // Phase: "listening" (audio prompt playing, timer held, mic closed)
  //        "answering" (audio stopped, timer running, mic active)
  const [phase, setPhase] = useState<OralPhase>(isOralMode && sonAvailable ? "listening" : "answering");
  const phaseRef = useRef<OralPhase>(phase);
  phaseRef.current = phase;

  // Stably track active question ID across async network hops and re-renders
  const activeQuestionIdRef = useRef<string>(questionId);
  activeQuestionIdRef.current = questionId;

  // Track question ID to which the current audio element is bound
  const currentAudioQuestionIdRef = useRef<string | null>(null);

  // Stably track current answer and change callback to prevent stale closure overwrites on speech pauses
  const answerRef = useRef<string>(currentAnswer);
  answerRef.current = currentAnswer;
  const onAnswerChangeRef = useRef(onAnswerChange);
  onAnswerChangeRef.current = onAnswerChange;

  // Audio state
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Microphone / Speech state
  const [isMicListening, setIsMicListening] = useState(false);
  const [soundActive, setSoundActive] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [speechError, setSpeechError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const recognizerRef = useRef<any | null>(null);
  const isSpeechSupported = isWebSpeechSupported();
  const unlockedRef = useRef(false);

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Notify parent of phase changes
  const updatePhase = useCallback(
    (newPhase: OralPhase) => {
      setPhase(newPhase);
      phaseRef.current = newPhase;
      onPhaseChange?.(newPhase);
    },
    [onPhaseChange],
  );

  // ---------------------------------------------------------------------------
  // WEB SPEECH RECOGNITION CONTROLLER
  // ---------------------------------------------------------------------------
  const startSpeechRecognition = useCallback(() => {
    if (!enabledRef.current || !isSpeechSupported) {
      if (!isSpeechSupported) {
        setSpeechError("Chrome or Edge is recommended for speech recognition.");
      }
      return;
    }

    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {}
      recognizerRef.current = null;
    }

    const SR = getSpeechRecognitionCtor();
    if (!SR) return;

    try {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsMicListening(true);
        setSpeechError(null);
      };

      rec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const r = event.results[i];
          if (r?.[0]?.transcript) {
            const transcript = r[0].transcript;
            if (r.isFinal) {
              setInterimText("");
              // CONTINUOUS ACCUMULATION: Always append to the live answerRef, never replace
              const updated = appendSpeechText(answerRef.current, transcript);
              answerRef.current = updated;
              onAnswerChangeRef.current(updated);
            } else {
              setInterimText(transcript);
            }
          }
        }
      };

      rec.onsoundstart = () => setSoundActive(true);
      rec.onsoundend = () => setSoundActive(false);

      rec.onerror = (e: any) => {
        const code = e?.error || "unknown";
        if (code === "no-speech" || code === "aborted") return;
        if (code === "not-allowed" || code === "service-not-allowed") {
          setIsMicListening(false);
          setSpeechError("Microphone access denied. Enable mic in browser settings.");
          return;
        }
        setSpeechError(`Speech error: ${code}`);
      };

      rec.onend = () => {
        setSoundActive(false);
        // Only restart if still answering and enabled
        if (enabledRef.current && phaseRef.current === "answering" && isMicListening) {
          try {
            rec.start();
          } catch {}
        } else {
          setIsMicListening(false);
        }
      };

      rec.start();
      recognizerRef.current = rec;
      setIsMicListening(true);
    } catch (e) {
      console.warn("[OralController] Failed to start speech recognition:", e);
      setIsMicListening(false);
    }
  }, [isSpeechSupported]);

  const stopSpeechRecognition = useCallback(() => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {}
      recognizerRef.current = null;
    }
    setIsMicListening(false);
    setSoundActive(false);
    setInterimText("");
  }, []);

  // ---------------------------------------------------------------------------
  // TRANSITION: START ANSWERING (ATOMIC HANDOFF)
  // ---------------------------------------------------------------------------
  const startAnswering = useCallback(() => {
    // 1. Immediately pause and silence audio
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsAudioPlaying(false);

    // 2. Set phase to answering
    updatePhase("answering");

    // 3. Open microphone automatically for candidate
    startSpeechRecognition();
  }, [updatePhase, startSpeechRecognition]);

  // ---------------------------------------------------------------------------
  // AUDIO SYNTHESIS & PLAYBACK CONTROLLER
  // ---------------------------------------------------------------------------
  const playPromptAudio = useCallback(async () => {
    if (!enabledRef.current || !sonAvailable || !text.trim()) return;
    const targetQId = questionId;

    // Mutex: stop microphone before speaking audio to prevent acoustic echo
    stopSpeechRecognition();
    setAudioError(null);

    // 1. Only reuse audioRef if it was created specifically for targetQId
    if (
      audioRef.current &&
      currentAudioQuestionIdRef.current === targetQId &&
      audioRef.current.src
    ) {
      try {
        await audioRef.current.play();
        setIsAudioPlaying(true);
        unlockedRef.current = true;
        return;
      } catch {
        // Autoplay policy
      }
    }

    // 2. If audioRef belonged to a different question, destroy it immediately!
    if (audioRef.current && currentAudioQuestionIdRef.current !== targetQId) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
      currentAudioQuestionIdRef.current = null;
    }

    // 3. Check if prefetched audio exists in cache for this target question + voice
    const cacheKey = questionAudioCacheKey(targetQId, voiceId);
    const cached = getCachedAudioUrl(cacheKey);
    if (cached) {
      if (activeQuestionIdRef.current !== targetQId) return; // Stale check

      setAudioUrl(cached);
      const audio = new Audio(cached);
      audio.playbackRate = playbackSpeed;
      currentAudioQuestionIdRef.current = targetQId; // strictly mark this audio instance
      audio.onended = () => {
        setIsAudioPlaying(false);
        // Prompt finished reading! Transition to answering & open mic automatically
        startAnswering();
      };
      audio.onpause = () => setIsAudioPlaying(false);
      audio.onplay = () => setIsAudioPlaying(true);
      audioRef.current = audio;

      try {
        await audio.play();
        setIsAudioPlaying(true);
        unlockedRef.current = true;
      } catch (e) {
        console.warn("[OralController] Autoplay needs gesture:", e);
        setIsAudioPlaying(false);
      }
      return;
    }

    // 4. Resolve audio through the shared prefetch path strictly for targetQId.
    //    Going through prefetchQuestionAudio means a background prefetch that is
    //    already in flight is awaited instead of synthesized a second time.
    setIsSynthesizing(true);
    if (abortCtrlRef.current) abortCtrlRef.current.abort();
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    try {
      const url = await prefetchQuestionAudio(
        targetQId,
        text,
        title,
        voiceId,
        "kokoro",
        ctrl.signal,
      );

      // Superseded by a newer play request (e.g. replay), or the question changed.
      if (abortCtrlRef.current !== ctrl) return;
      if (activeQuestionIdRef.current !== targetQId) return;
      if (!enabledRef.current) return;
      // Candidate already skipped ahead to answering: never start the prompt under them.
      if (phaseRef.current !== "listening") return;

      if (!url) throw new Error("Speech synthesis failed");

      setAudioUrl(url);

      const audio = new Audio(url);
      audio.playbackRate = playbackSpeed;
      currentAudioQuestionIdRef.current = targetQId;

      audio.onended = () => {
        setIsAudioPlaying(false);
        // Prompt finished reading! Transition to answering & open mic automatically
        startAnswering();
      };
      audio.onpause = () => setIsAudioPlaying(false);
      audio.onplay = () => setIsAudioPlaying(true);
      audioRef.current = audio;

      try {
        await audio.play();
        setIsAudioPlaying(true);
        unlockedRef.current = true;
      } catch (e) {
        console.warn("[OralController] Autoplay needs gesture:", e);
        setIsAudioPlaying(false);
      }
    } catch (e: unknown) {
      if (abortCtrlRef.current !== ctrl) return;
      if (e instanceof Error && e.name === "AbortError") return;
      if (activeQuestionIdRef.current !== targetQId || !enabledRef.current) return;
      setAudioError(e instanceof Error ? e.message : "Speech synthesis failed");
      setIsAudioPlaying(false);
      // If audio fails, fail open to answering phase
      updatePhase("answering");
    } finally {
      if (abortCtrlRef.current === ctrl) setIsSynthesizing(false);
    }
  }, [sonAvailable, text, title, questionId, voiceId, playbackSpeed, stopSpeechRecognition, startAnswering, updatePhase]);

  // Autoplay insurance on first click anywhere (only active when enabled in question view)
  useEffect(() => {
    const handleGesture = () => {
      if (unlockedRef.current || !enabledRef.current) return;
      if (
        audioRef.current &&
        audioRef.current.paused &&
        audioRef.current.src &&
        currentAudioQuestionIdRef.current === activeQuestionIdRef.current &&
        phaseRef.current === "listening"
      ) {
        audioRef.current
          .play()
          .then(() => {
            unlockedRef.current = true;
            setIsAudioPlaying(true);
          })
          .catch(() => {});
      }
    };
    document.addEventListener("pointerdown", handleGesture);
    return () => document.removeEventListener("pointerdown", handleGesture);
  }, []);

  // Update speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Handle enabled changes (e.g. leaving question view)
  useEffect(() => {
    if (!enabled) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      currentAudioQuestionIdRef.current = null;
      setAudioUrl(null);
      stopSpeechRecognition();
      setIsAudioPlaying(false);
    }
  }, [enabled, stopSpeechRecognition]);

  // Mount/Change Question Lifecycle: STRICT CLEANUP & RE-INITIALIZATION
  useEffect(() => {
    // 1. Immediately terminate and destroy previous question's audio and speech
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    currentAudioQuestionIdRef.current = null;
    setAudioUrl(null);
    setIsAudioPlaying(false);
    stopSpeechRecognition();

    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = null;
    }

    setAudioError(null);
    setSpeechError(null);

    if (!enabled || !isOralMode || !sonAvailable) return;

    // 2. Set phase for new question
    const initialPhase: OralPhase = "listening";
    updatePhase(initialPhase);

    // 3. Play prompt audio strictly for the current question
    if (autoPlay) {
      playPromptAudio();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      currentAudioQuestionIdRef.current = null;
      stopSpeechRecognition();
      if (abortCtrlRef.current) abortCtrlRef.current.abort();
    };
  }, [questionId, isOralMode, sonAvailable, enabled, autoPlay]);

  // Controls for UI
  const togglePlayAudio = useCallback(() => {
    if (isAudioPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      }
    } else {
      playPromptAudio();
    }
  }, [isAudioPlaying, playPromptAudio]);

  const replayPrompt = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    updatePhase("listening");
    playPromptAudio();
  }, [updatePhase, playPromptAudio]);

  const toggleMic = useCallback(() => {
    // If user clicks mic during listening phase, immediately start answering
    if (phaseRef.current === "listening") {
      startAnswering();
      return;
    }

    if (isMicListening) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  }, [isMicListening, startAnswering, stopSpeechRecognition, startSpeechRecognition]);

  return {
    phase,
    isListeningPhase: phase === "listening",
    isAnsweringPhase: phase === "answering",
    startAnswering,
    // Audio controls
    isAudioPlaying,
    isSynthesizing,
    playbackSpeed,
    setPlaybackSpeed,
    audioError,
    togglePlayAudio,
    replayPrompt,
    // Mic controls
    isMicListening,
    soundActive,
    interimText,
    speechError,
    toggleMic,
    stopSpeechRecognition,
  };
}
