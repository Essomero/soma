import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Download,
  Volume2, VolumeX, Gauge,
} from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  audioUrl: string;
  duration?: string;
  durationSeconds?: number;
  episodeSlug?: string;
  title?: string;
  className?: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SKIP_SECONDS = 15;
const STALE_DAYS = 30;

function loadProgress(slug: string): { position: number; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(`podcast:progress:${slug}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const age = Date.now() - data.timestamp;
    if (age > STALE_DAYS * 86400_000) return null; // stale
    return data;
  } catch { return null; }
}

function saveProgress(slug: string, position: number) {
  try {
    localStorage.setItem(`podcast:progress:${slug}`, JSON.stringify({
      position,
      timestamp: Date.now(),
    }));
  } catch { /* quota exceeded : silently skip */ }
}

export default function AudioPlayer({
  audioUrl,
  duration = "00:00",
  durationSeconds = 0,
  episodeSlug,
  title,
  className,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(durationSeconds);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [hasResumed, setHasResumed] = useState(false);

  // ── Create audio element ────────────────────────────
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.preload = "metadata";
    audioRef.current = audio;

    const onLoaded = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
      // Resume from saved position
      if (episodeSlug && !hasResumed) {
        const saved = loadProgress(episodeSlug);
        if (saved && saved.position > 0 && saved.position < (audio.duration || Infinity)) {
          audio.currentTime = saved.position;
          setCurrentTime(saved.position);
        }
        setHasResumed(true);
      }
    };

    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist progress on pause / unmount ─────────────
  const persist = useCallback(() => {
    if (episodeSlug && audioRef.current) {
      saveProgress(episodeSlug, audioRef.current.currentTime);
    }
  }, [episodeSlug]);

  useEffect(() => {
    if (!isPlaying && currentTime > 0) persist();
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { persist(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls ────────────────────────────────────────
  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play().catch(() => {}); }
    else { a.pause(); }
  };

  const seek = (percent: number) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    a.currentTime = (percent / 100) * a.duration;
    setCurrentTime(a.currentTime);
  };

  const skip = (seconds: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + seconds));
    setCurrentTime(a.currentTime);
  };

  const toggleMute = () => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = !a.muted;
    setIsMuted(a.muted);
  };

  const changeVolume = (v: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = v;
    setVolume(v);
    setIsMuted(v === 0);
  };

  const changeSpeed = (s: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = s;
    setSpeed(s);
    setShowSpeed(false);
  };

  // ── Format helpers ───────────────────────────────────
  const total = audioDuration || durationSeconds;
  const progress = total > 0 ? (currentTime / total) * 100 : 0;
  const audioExt = audioUrl.split("?")[0].toLowerCase().endsWith(".m4a") ? "m4a" : "mp3";

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // ── Render ───────────────────────────────────────────
  return (
    <div
      className={cn(
        "sticky top-16 z-40 bg-surface-container-low/90 backdrop-blur-xl border-b border-border-default px-gutter md:px-margin-desktop py-md",
        className
      )}
    >
      <div className="flex flex-col md:flex-row items-center gap-md md:gap-xl max-w-readme mx-auto">
        {/* Play + Skip */}
        <div className="flex items-center gap-md">
        <Tooltip label={isPlaying ? "Pause" : "Play"}>
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-on-primary hover:scale-105 transition-transform active:scale-95 shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-0.5" />
            )}
          </button>
        </Tooltip>
          <div className="flex items-center gap-xs text-on-surface-muted">
            <Tooltip label="Back 15s">
              <button onClick={() => skip(-SKIP_SECONDS)}>
                <SkipBack className="w-5 h-5 hover:text-on-surface transition-colors" />
              </button>
            </Tooltip>
            <Tooltip label="Forward 15s">
              <button onClick={() => skip(SKIP_SECONDS)}>
                <SkipForward className="w-5 h-5 hover:text-on-surface transition-colors" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex-1 w-full">
          <div className="flex justify-between font-sora text-label-caps text-on-surface-muted mb-1">
            <span>{fmtTime(currentTime)}</span>
            <span>{total > 0 ? fmtTime(total) : duration}</span>
          </div>
          <div
            className="relative h-1.5 w-full bg-surface-variant rounded-full overflow-hidden cursor-pointer group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seek(((e.clientX - rect.left) / rect.width) * 100);
            }}
          >
            <div
              className="absolute left-0 top-0 h-full bg-primary transition-all duration-100 group-hover:bg-secondary"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-lg">
          {/* Speed selector */}
          <div className="relative">
            <Tooltip label="Playback speed">
              <button
                onClick={() => setShowSpeed(!showSpeed)}
                className="flex items-center gap-xs font-sora text-xs text-on-surface-muted hover:text-on-surface transition-colors"
              >
                <Gauge className="w-4 h-4" />
                {speed}x
              </button>
            </Tooltip>
            {showSpeed && (
              <div className="absolute bottom-full mb-sm left-1/2 -translate-x-1/2 bg-surface border border-border-default rounded-lg py-xs shadow-xl z-50">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={cn(
                      "block w-full px-md py-xs text-sm font-sora text-left hover:bg-surface-container-low transition-colors whitespace-nowrap",
                      s === speed ? "text-primary font-bold" : "text-on-surface-muted"
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volume */}
          <div className="flex items-center gap-xs">
            <Tooltip label={isMuted ? "Unmute" : "Mute"}>
              <button onClick={toggleMute}>
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-on-surface-muted hover:text-on-surface transition-colors" />
                ) : (
                  <Volume2 className="w-4 h-4 text-on-surface-muted hover:text-on-surface transition-colors" />
                )}
              </button>
            </Tooltip>
            <Tooltip label="Volume">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => changeVolume(parseFloat(e.target.value))}
                className="w-16 h-1 accent-primary cursor-pointer hidden sm:block"
              />
            </Tooltip>
          </div>

          {/* Download */}
          <Tooltip label="Download episode">
            <a
              href={audioUrl}
              download={title ? `${title}.${audioExt}` : `episode.${audioExt}`}
              className="flex items-center gap-xs font-sora text-metadata-tag uppercase text-on-surface-variant hover:text-primary transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
