import { Play, Pause, RotateCcw, Volume2, AlertCircle, Loader2 } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";

interface OralQuestionAudioProps {
  examinerName?: string;
  examinerTitle?: string;
  isAudioPlaying: boolean;
  isSynthesizing: boolean;
  playbackSpeed: number;
  onSetSpeed: (speed: number) => void;
  onTogglePlay: () => void;
  onReplay: () => void;
  error?: string | null;
  isListeningPhase: boolean;
  onStartAnswering: () => void;
}

export default function OralQuestionAudio({
  examinerName = "Michael",
  examinerTitle = "Technical Examiner",
  isAudioPlaying,
  isSynthesizing,
  playbackSpeed,
  onSetSpeed,
  onTogglePlay,
  onReplay,
  error,
  isListeningPhase,
  onStartAnswering,
}: OralQuestionAudioProps) {
  return (
    <div className="bg-[#121820] border border-border-default/60 rounded-xl p-md mb-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        {/* Examiner Info & Waveform */}
        <div className="flex items-center gap-md">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/30 text-primary">
            {isSynthesizing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
            {isAudioPlaying && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-green rounded-full animate-ping" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-sm">
              <span className="font-sora text-xs font-semibold text-on-surface">
                {examinerName}
              </span>
              <span className="font-dm-sans text-[11px] text-on-surface-variant">
                // {examinerTitle}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                Kokoro · am_michael
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              {isAudioPlaying ? (
                <div className="flex items-center gap-1 h-3.5">
                  <span className="w-1 bg-primary rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3" />
                  <span className="w-1 bg-primary rounded-full animate-[pulse_0.4s_ease-in-out_infinite_0.1s] h-4" />
                  <span className="w-1 bg-primary rounded-full animate-[pulse_0.7s_ease-in-out_infinite_0.2s] h-2" />
                  <span className="w-1 bg-primary rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.3s] h-3.5" />
                  <span className="font-sora text-[11px] text-primary ml-1 font-medium">
                    Speaking question...
                  </span>
                </div>
              ) : isSynthesizing ? (
                <span className="font-sora text-[11px] text-on-surface-variant">
                  Synthesizing speech with Kokoro...
                </span>
              ) : isListeningPhase ? (
                <span className="font-sora text-[11px] text-primary">
                  Listening to prompt. Answer timer starts when reading ends.
                </span>
              ) : (
                <span className="font-sora text-[11px] text-on-surface-variant">
                  Prompt delivered. You may replay or speak your answer.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center gap-sm">
          {/* Skip to Answering Button (if in listening phase) */}
          {isListeningPhase && (
            <button
              type="button"
              onClick={onStartAnswering}
              className="px-2.5 py-1 rounded-lg bg-surface border border-primary/40 font-sora text-xs text-primary hover:bg-primary/10 transition-colors"
            >
              Start Answering &rarr;
            </button>
          )}

          {/* Speed Selector */}
          <div className="flex items-center rounded-lg bg-surface border border-border-default/50 p-0.5 text-xs font-mono">
            {[0.75, 1, 1.25, 1.5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onSetSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  playbackSpeed === spd
                    ? "bg-primary text-[#0e1319] font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Replay Button */}
          <Tooltip label="Replay question prompt">
          <button
            type="button"
            onClick={onReplay}
            disabled={isSynthesizing}
            className="p-2 rounded-lg bg-surface border border-border-default/50 text-on-surface hover:text-primary transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          </Tooltip>

          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={isSynthesizing}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-sora text-xs font-semibold transition-colors ${
              isAudioPlaying
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                : "bg-primary text-[#0e1319] hover:bg-primary/90"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isSynthesizing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading...</span>
              </>
            ) : isAudioPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Listen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-sm flex items-center gap-2 text-xs text-error font-sora">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
