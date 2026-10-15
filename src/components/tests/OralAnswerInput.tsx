import { useState } from "react";
import { Mic, MicOff, AlertCircle, Copy, Check, RotateCcw, Sparkles } from "lucide-react";
import type { TestQuestionOption } from "@/types";

interface OralAnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  questionType?: "open" | "multiple-choice";
  options?: TestQuestionOption[];
  selectedOptionIds?: string[];
  onToggleOption?: (optionId: string) => void;
  // Controlled mic state from useOralQuestion
  isMicListening: boolean;
  soundActive: boolean;
  interimText: string;
  speechError?: string | null;
  onToggleMic: () => void;
}

export default function OralAnswerInput({
  value,
  onChange,
  placeholder = "Speak your response aloud or type your answer here...",
  disabled = false,
  isMicListening,
  soundActive,
  interimText,
  speechError,
  onToggleMic,
}: OralAnswerInputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClear = () => {
    if (disabled) return;
    onChange("");
  };

  return (
    <div className="space-y-md">
      {/* Speech Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-md p-md rounded-xl bg-[#121820] border border-border-default/60">
        <div className="flex items-center gap-md">
          {/* Pulsing Mic Button */}
          <div className="relative">
            {isMicListening && (
              <span
                className={`absolute -inset-1 rounded-full transition-all duration-300 ${
                  soundActive
                    ? "bg-primary/40 animate-ping"
                    : "bg-primary/20 animate-pulse"
                }`}
              />
            )}
            <button
              type="button"
              onClick={onToggleMic}
              disabled={disabled}
              title={isMicListening ? "Mute microphone" : "Click to speak your answer"}
              className={`relative flex items-center justify-center w-11 h-11 rounded-full font-sora font-semibold transition-all duration-200 shadow-md ${
                isMicListening
                  ? "bg-primary text-[#0e1319] ring-2 ring-primary ring-offset-2 ring-offset-[#0e1319]"
                  : "bg-surface border border-border-default text-on-surface hover:text-primary hover:border-primary/50"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isMicListening ? (
                <Mic className="w-5 h-5 animate-pulse" />
              ) : (
                <MicOff className="w-5 h-5 text-on-surface-variant" />
              )}
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-sora text-xs font-semibold text-on-surface">
                {isMicListening ? "Listening with Web Speech..." : "Voice Input (Chrome Web Speech)"}
              </span>
              {isMicListening && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-brand-green/20 text-brand-green border border-brand-green/30">
                  REC
                </span>
              )}
            </div>
            <p className="font-dm-sans text-xs text-on-surface-variant">
              {isMicListening
                ? soundActive
                  ? "Capturing voice audio : speak clearly..."
                  : "Listening... speak into your microphone"
                : "Microphone paused. Click to resume dictation or type below."}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-sm">
          {value && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border-default/50 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                title="Copy transcribed answer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="font-sora text-[11px]">{copied ? "Copied" : "Copy"}</span>
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={disabled}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border-default/50 text-xs text-on-surface-variant hover:text-error transition-colors disabled:opacity-40"
                title="Clear answer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="font-sora text-[11px]">Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Real-time Interim Transcription Strip */}
      {interimText && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30 text-xs font-dm-sans text-primary animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
          <div>
            <span className="font-semibold text-primary font-sora text-[11px] mr-1 uppercase">Transcribing:</span>
            <span className="italic">{interimText}</span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {speechError && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-error/15 border border-error/30 text-xs text-error font-sora">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Editable Transcribed Textarea */}
      <div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          rows={6}
          style={{ backgroundColor: "#0e1319", color: "#dfe2eb" }}
          className="w-full rounded-xl border border-border-default p-md font-dm-sans text-body-base leading-relaxed placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
        />
        <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant mt-1 px-1">
          <span>Words spoken: {value.trim() ? value.trim().split(/\s+/).length : 0}</span>
          <span>You can speak or manually edit anytime</span>
        </div>
      </div>
    </div>
  );
}
