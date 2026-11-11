import { useState } from "react";
import { Terminal, ChevronDown, Check, Copy, FileCode, Play, Folder } from "lucide-react";
import hljs from "highlight.js";
import type { LabBlock as LabBlockType, LabFile } from "@/types";
import Tooltip from "@/components/ui/Tooltip";

interface LabBlockProps {
  block: LabBlockType;
  className?: string;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable
    }
  };

  return (
    <Tooltip label={label || "Copy to clipboard"}>
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-xs px-2 py-1 rounded text-xs font-mono text-on-surface-muted hover:text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors"
    >
      {copied ? (
        <>
          <Check size={12} className="text-secondary" />
          {label && <span className="text-secondary text-[11px]">Copied</span>}
        </>
      ) : (
        <>
          <Copy size={12} />
          {label && <span className="text-[11px]">{label}</span>}
        </>
      )}
    </button>
    </Tooltip>
  );
}

function HighlightedCode({ code, language }: { code: string; language?: string }) {
  const lang = language?.toLowerCase() ?? "";
  const highlighted = (() => {
    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      return code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  })();

  return (
    <pre className="p-md font-mono text-xs leading-relaxed overflow-x-auto thin-scrollbar bg-surface-lowest">
      <code className={`hljs language-${lang}`} dangerouslySetInnerHTML={{ __html: highlighted }} />
    </pre>
  );
}

export default function LabBlock({ block, className = "" }: LabBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const files = block.files || [];
  const currentFile: LabFile | undefined = files[activeFileIndex];

  return (
    <div
      className={`my-lg rounded-xl border border-border-default/60 bg-surface-container-lowest overflow-hidden [overflow-anchor:none] transition-colors duration-200 hover:border-primary/40 ${
        isOpen ? "border-primary/30 shadow-sm" : ""
      } ${className}`}
    >
      {/* ── Collapsed Milestone Bar (~38px tall) ────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-sm px-md py-2.5 cursor-pointer list-none select-none bg-surface-container-low/40 hover:bg-surface-container-low transition-colors text-left"
      >
        <div className="flex items-center gap-sm min-w-0">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-secondary/10 text-secondary shrink-0">
            <Terminal size={13} strokeWidth={2.2} />
          </div>

          <div className="flex items-center gap-xs truncate font-sora">
            <span className="text-xs font-semibold text-on-surface tracking-tight">
              Lab
            </span>
            {block.step && (
              <span className="text-[10px] font-bold text-secondary bg-secondary/15 px-1.5 py-0.5 rounded">
                Step {block.step.current}/{block.step.total}
              </span>
            )}
            <span className="text-on-surface-muted text-xs mx-0.5">·</span>
            <span className="text-xs text-on-surface font-medium truncate">
              {block.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-sm shrink-0">
          <span className="font-mono text-[11px] text-on-surface-muted bg-surface-container px-2 py-0.5 rounded border border-border-default/40 hidden sm:inline-block">
            {block.path}
          </span>
          <ChevronDown
            size={14}
            className={`text-on-surface-muted transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* ── Expanded Workbench Details ─────────────────────── */}
      <div
        className="reveal-grid"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden min-h-0">
          <div
            className={`p-lg border-t border-border-default/50 space-y-md text-sm font-dm-sans bg-surface-lowest/50 reveal-fade ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
          >
        {/* Repo Path & Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm pb-sm border-b border-border-default/40">
          <div className="flex items-center gap-xs font-mono text-xs text-on-surface-variant">
            <Folder size={13} className="text-secondary shrink-0" />
            <span className="text-on-surface-muted">path:</span>
            <span className="text-on-surface font-semibold">{block.path}</span>
          </div>
          <CopyButton text={`cd ${block.path}`} label={`cd ${block.path}`} />
        </div>

        {block.summary && (
          <p className="text-on-surface-variant text-sm leading-relaxed">
            {block.summary}
          </p>
        )}

        {/* Multi-File or Single-File Tabs */}
        {files.length > 0 && currentFile && (
          <div className="rounded-lg border border-border-default overflow-hidden bg-surface-lowest">
            {/* File header / Tab bar */}
            <div className="flex items-center justify-between px-md py-sm bg-surface-container border-b border-border-default">
              <div className="flex items-center gap-xs overflow-x-auto thin-scrollbar">
                {files.map((file, idx) => {
                  const isActive = idx === activeFileIndex;
                  return (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => setActiveFileIndex(idx)}
                      className={`inline-flex items-center gap-xs px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                        isActive
                          ? "bg-surface-lowest text-on-surface font-semibold shadow-xs border border-border-default"
                          : "text-on-surface-muted hover:text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      <FileCode size={12} />
                      <span>{file.path}</span>
                      {file.action && (
                        <span
                          className={`text-[9px] uppercase px-1 py-0.2 rounded font-bold ${
                            file.action === "modify"
                              ? "bg-accent-orange/20 text-accent-orange"
                              : file.action === "create"
                              ? "bg-secondary/20 text-secondary"
                              : "bg-surface-container-highest text-on-surface-muted"
                          }`}
                        >
                          {file.action}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <CopyButton text={currentFile.code} label="Copy file" />
            </div>

            {/* File description if any */}
            {currentFile.description && (
              <div className="px-md py-xs text-xs font-dm-sans text-on-surface-muted bg-surface-container-low border-b border-border-default">
                {currentFile.description}
              </div>
            )}

            {/* File code */}
            <HighlightedCode code={currentFile.code} language={currentFile.language} />
          </div>
        )}

        {/* Terminal Run Command Box */}
        <div className="rounded-lg border border-border-default overflow-hidden bg-surface-lowest">
          <div className="flex items-center justify-between px-md py-xs bg-surface-container border-b border-border-default">
            <span className="font-sora text-[10px] uppercase font-bold tracking-wider text-on-surface-muted flex items-center gap-xs">
              <Play size={10} className="text-secondary" />
              Terminal Verification
            </span>
            <CopyButton text={block.command} label="Copy command" />
          </div>
          <div className="p-md font-mono text-xs text-on-surface bg-surface-lowest flex items-center gap-sm">
            <span className="text-secondary select-none font-bold">$</span>
            <span className="text-on-surface font-semibold overflow-x-auto">{block.command}</span>
          </div>

          {/* Expected Output */}
          {block.output && (
            <div className="border-t border-border-default/50 px-md py-sm bg-surface-container-low/50 font-mono text-[11px] text-on-surface-muted">
              <div className="text-[9px] uppercase tracking-wider text-on-surface-muted font-bold mb-xs">
                Expected Output
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed text-secondary/90">
                {block.output}
              </pre>
            </div>
          )}
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
