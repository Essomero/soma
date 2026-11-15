import { useState, useEffect } from "react";
import { Mic, MicOff, Square, Sparkles, AlertCircle } from "lucide-react";

// ── Device types ──────────────────────────────────────

interface AudioInputInfo {
  deviceId: string;
  label: string;
}

async function listAudioInputs(): Promise<AudioInputInfo[]> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === "audioinput")
      .map((d) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 8)}…` }));
  } catch {
    return [];
  }
}

// ── Props ─────────────────────────────────────────────

export interface DictationBarProps {
  /** Whether Chrome STT is actively listening. */
  isRecognizing: boolean;
  /** Whether audio input (sound) is currently being detected. */
  soundActive: boolean;
  /** The latest interim (non-final) transcription text. */
  interimText: string;
  /** Error message to display, if any. */
  error?: string | null;
  /** Called to toggle dictation on/off. */
  onToggle: () => void;
  /** Whether dictation is currently active (enabled). */
  active: boolean;
}

export default function DictationBar({
  isRecognizing,
  soundActive,
  interimText,
  error,
  onToggle,
  active,
}: DictationBarProps) {
  const [devices, setDevices] = useState<AudioInputInfo[]>([]);

  // Load audio input devices on mount
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    let mounted = true;

    const loadDevices = () =>
      listAudioInputs().then((list) => {
        if (mounted) setDevices(list);
      });

    // Request mic permission so enumerateDevices returns labels
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        loadDevices();
      })
      .catch(() => {
        // Permission denied — still list devices, labels will be empty
        loadDevices();
      });

    return () => {
      mounted = false;
    };
  }, []);

  const defaultDevice = devices.length > 0 ? devices[0] : null;

  return (
    <div className="border-b border-border-default bg-surface-container-low px-lg py-md">
      {/* Top row: mic button + status + device selector + stop */}
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div className="flex items-center gap-md">
          {/* Mic visual */}
          <div className="relative shrink-0">
            {isRecognizing && (
              <span
                className={`absolute -inset-1.5 rounded-full transition-all duration-300 ${
                  soundActive
                    ? "bg-primary/40 animate-ping"
                    : "bg-primary/20 animate-pulse"
                }`}
              />
            )}
            <div
              className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                isRecognizing
                  ? "bg-primary text-[#0e1319] ring-2 ring-primary ring-offset-2 ring-offset-[#0e1319]"
                  : "bg-surface border border-border-default text-on-surface-muted"
              }`}
            >
              {isRecognizing ? (
                <Mic className={`w-5 h-5 ${soundActive ? "animate-pulse" : ""}`} />
              ) : (
                <MicOff className="w-4 h-4" />
              )}
            </div>
          </div>

          {/* Status text */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sora text-xs font-semibold text-on-surface">
                {isRecognizing ? "Voice dictation" : "Dictation paused"}
              </span>
              {isRecognizing && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-brand-green/20 text-brand-green border border-brand-green/30">
                  {soundActive ? "SPEAKING" : "LISTENING"}
                </span>
              )}
            </div>
            <p className="font-dm-sans text-xs text-on-surface-muted">
              {isRecognizing
                ? soundActive
                  ? "Capturing audio — speak clearly..."
                  : "Waiting for speech..."
                : "Tap the mic to start dictation"}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-sm flex-wrap">
          {/* Active device indicator (read-only — webkitSpeechRecognition always uses default mic) */}
          {isRecognizing && defaultDevice && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface border border-border-default/60 text-[11px] font-sora text-on-surface-muted max-w-[180px] truncate">
              {defaultDevice.label}
            </span>
          )}

          {/* Stop / toggle button */}
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sora text-xs transition-colors ${
              active
                ? "bg-error/20 text-error hover:bg-error/30 border border-error/40"
                : "bg-surface border border-border-default text-on-surface-muted hover:text-on-surface"
            }`}
          >
            {active ? (
              <><Square className="w-3.5 h-3.5" /> Stop</>
            ) : (
              <><Mic className="w-3.5 h-3.5" /> Resume</>
            )}
          </button>
        </div>
      </div>

      {/* Interim transcription strip */}
      {interimText && (
        <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-primary/10 border border-primary/30 text-xs font-dm-sans text-primary animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-primary font-sora text-[11px] mr-1 uppercase">Transcribing:</span>
            <span className="italic">{interimText}</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-error/15 border border-error/30 text-xs text-error font-sora">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}