import { useState } from "react";

interface CodeBlockProps {
  filename: string;
  lines: Array<{
    number: string;
    content: string;
  }>;
  className?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable : silently ignore
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="text-on-surface-muted hover:text-on-surface transition-colors p-xs rounded"
      aria-label="Copy code"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

export default function CodeBlock({
  filename,
  lines,
  className,
}: CodeBlockProps) {
  const fullText = lines.map((l) => l.content).join("\n");

  return (
    <div
      className={`my-giant bg-surface-lowest border border-border-default rounded-xl overflow-hidden shadow-2xl ${className ?? ""}`}
    >
      {/* Header bar with macOS dots */}
      <div className="flex items-center justify-between px-md py-sm bg-surface-container border-b border-border-default">
        <div className="flex gap-xs">
          <div className="w-3 h-3 rounded-full bg-error/40" />
          <div className="w-3 h-3 rounded-full bg-accent-orange/40" />
          <div className="w-3 h-3 rounded-full bg-secondary/40" />
        </div>
        <div className="flex items-center gap-lg">
          <CopyButton text={fullText} />
          <span className="font-sora text-[10px] uppercase text-on-surface-muted">
            {filename}
          </span>
        </div>
      </div>

      {/* Code content */}
      <div className="p-lg font-mono text-sm leading-relaxed overflow-x-auto">
        {lines.map((line) => {
          const isHuman = line.content.startsWith("Human:");
          const isAI = line.content.startsWith("ChatGPT:");

          return (
            <div key={line.number} className="flex gap-md mb-md last:mb-0">
              <span className="text-on-surface-muted select-none">
                {line.number}
              </span>
              <p>
                {isHuman ? (
                  <>
                    <span className="text-primary">Human:</span>
                    <span className="text-on-surface">
                      {line.content.slice(6)}
                    </span>
                  </>
                ) : isAI ? (
                  <>
                    <span className="text-tertiary">ChatGPT:</span>
                    <span className="text-on-surface">
                      {line.content.slice(8)}
                    </span>
                  </>
                ) : (
                  <span className="text-on-surface">{line.content}</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
