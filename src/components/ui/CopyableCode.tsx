import { useState, useCallback } from "react";

interface CopyableCodeProps {
  command: string;
  className?: string;
}

export default function CopyableCode({ command, className = "" }: CopyableCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [command]);

  return (
    <div className={`relative group ${className}`}>
      <code className="block text-xs text-on-surface font-mono bg-surface-container-high p-sm rounded pr-lg break-all">
        {command}
      </code>
      <button
        onClick={handleCopy}
        className="absolute top-1 right-1 p-xs rounded text-on-surface-muted hover:text-on-surface hover:bg-surface-container transition-colors opacity-0 group-hover:opacity-100"
        title={copied ? "Copied" : "Copy command"}
      >
        {copied ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  );
}
