/**
 * Inline one-shot voice input button for text fields (search, title, comments, etc.).
 * Tap mic → speak → first final result fires onResult → auto-stops.
 *
 * Designed for many instances across the app: each instance owns its own
 * recognizer lifecycle with proper unmount cleanup. No global state or
 * subscriptions.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic } from "lucide-react";

function getSpeechRecognitionCtor(): any | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const supported = (() => {
  if (typeof window === "undefined") return false;
  return getSpeechRecognitionCtor() !== null;
})();

export interface VoiceInputButtonProps {
  /** Called with the final transcription text. */
  onResult: (text: string) => void;
  /** Additional class names for the button. */
  className?: string;
  /** Recognition language tag. Default: "en-US". */
  lang?: string;
}

export default function VoiceInputButton({
  onResult,
  className = "",
  lang = "en-US",
}: VoiceInputButtonProps) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // Cleanup on unmount — prevents orphan recognizers when the parent
  // unmounts mid-dictation (e.g. navigating away, closing a comment form).
  useEffect(() => {
    return () => {
      try { recRef.current?.stop(); } catch { /* already stopped */ }
      recRef.current = null;
    };
  }, []);

  const handleClick = useCallback(() => {
    if (listening) {
      try { recRef.current?.stop(); } catch { /* already stopped */ }
      recRef.current = null;
      setListening(false);
      return;
    }

    const SR = getSpeechRecognitionCtor();
    if (!SR) return;

    try {
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = lang;

      rec.onresult = (event: any) => {
        const result = event.results?.[0]?.[0]?.transcript;
        if (result) onResultRef.current(result);
        try { rec.stop(); } catch { /* already stopped */ }
      };

      rec.onerror = () => setListening(false);
      rec.onend = () => {
        setListening(false);
        recRef.current = null;
      };

      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      // STT unavailable for this browser/environment
    }
  }, [listening, lang]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={listening ? "Tap to stop" : "Voice input"}
      className={`inline-flex items-center justify-center transition-all duration-200 shrink-0 ${
        listening
          ? "text-primary animate-pulse"
          : "text-on-surface-muted hover:text-primary"
      } ${className}`}
    >
      <Mic className="w-4 h-4" />
    </button>
  );
}