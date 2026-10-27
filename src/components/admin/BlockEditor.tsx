import { useState } from "react";
import {
  Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  Type, ImageIcon, Minus, MessageSquareQuote, Code2, Sigma,
  GitBranch, Youtube, MonitorPlay, BarChart3, Box, FlaskConical,
} from "lucide-react";
import type { ContentBlock } from "@/types";

// ── Block list editor ─────────────────────────────────
// Edits `(string | ContentBlock)[]` — the paragraphs field of a section,
// or the body of an article. Strings are markdown paragraphs; objects are
// typed ContentBlocks rendered by ContentBlocks.tsx.

export interface BlockItemEditorProps {
  blocks: (string | ContentBlock)[];
  onChange: (blocks: (string | ContentBlock)[]) => void;
}

type SimpleBlock =
  | "paragraph"
  | "image"
  | "horizontalRule"
  | "videoCallout"
  | "callout"
  | "code"
  | "math"
  | "mermaid"
  | "youtube";

// Blocks whose shape is a free-form JSON tree (chart/scene3d/lab) get a
// JSON textarea editor rather than dedicated field forms.
type JsonBlock = "chart" | "scene3d" | "lab";

const ADDABLE: { kind: SimpleBlock | JsonBlock; label: string; icon: React.ReactNode }[] = [
  { kind: "paragraph", label: "Paragraph", icon: <Type className="w-3 h-3" /> },
  { kind: "image", label: "Image", icon: <ImageIcon className="w-3 h-3" /> },
  { kind: "horizontalRule", label: "Divider", icon: <Minus className="w-3 h-3" /> },
  { kind: "callout", label: "Callout", icon: <MessageSquareQuote className="w-3 h-3" /> },
  { kind: "code", label: "Code", icon: <Code2 className="w-3 h-3" /> },
  { kind: "math", label: "Math (KaTeX)", icon: <Sigma className="w-3 h-3" /> },
  { kind: "mermaid", label: "Mermaid Diagram", icon: <GitBranch className="w-3 h-3" /> },
  { kind: "youtube", label: "YouTube", icon: <Youtube className="w-3 h-3" /> },
  { kind: "videoCallout", label: "Video Callout", icon: <MonitorPlay className="w-3 h-3" /> },
  { kind: "chart", label: "Chart (JSON)", icon: <BarChart3 className="w-3 h-3" /> },
  { kind: "scene3d", label: "3D Scene (JSON)", icon: <Box className="w-3 h-3" /> },
  { kind: "lab", label: "Lab (JSON)", icon: <FlaskConical className="w-3 h-3" /> },
];

function emptyBlock(kind: SimpleBlock | JsonBlock): ContentBlock {
  switch (kind) {
    case "paragraph": return { type: "paragraph", text: "" };
    case "image": return { type: "image", src: "", alt: "", caption: "" };
    case "horizontalRule": return { type: "horizontalRule" };
    case "videoCallout": return { type: "videoCallout", title: "", links: [{ label: "", url: "" }] };
    case "callout": return { type: "callout", variant: "info", text: "", title: "" };
    case "code": return { type: "code", code: "", language: "", filename: "" };
    case "math": return { type: "math", expression: "", display: true };
    case "mermaid": return { type: "mermaid", diagram: "", caption: "" };
    case "youtube": return { type: "youtube", videoId: "", caption: "" };
    case "chart": return { type: "chart", nodes: [] };
    case "scene3d": return { type: "scene3d", objects: [] };
    case "lab": return { type: "lab", title: "", path: "", command: "" };
  }
}

/** Discriminant check for a parsed JSON blob: must be a known block type. */
function isKnownBlock(v: unknown): v is ContentBlock {
  if (!v || typeof v !== "object") return false;
  const b = v as Record<string, unknown>;
  if (typeof b.type !== "string") return false;
  switch (b.type) {
    case "paragraph": return typeof b.text === "string";
    case "image": return typeof b.src === "string" && typeof b.alt === "string";
    case "horizontalRule": return true;
    case "videoCallout": return typeof b.title === "string" && Array.isArray(b.links);
    case "callout": return typeof b.text === "string";
    case "code": return typeof b.code === "string";
    case "math": return typeof b.expression === "string";
    case "mermaid": return typeof b.diagram === "string";
    case "youtube": return typeof b.videoId === "string";
    case "chart": return Array.isArray(b.nodes);
    case "scene3d": return Array.isArray(b.objects);
    case "lab": return typeof b.title === "string" && typeof b.path === "string" && typeof b.command === "string";
    default: return false;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-dm-sans text-xs text-on-surface-muted block mb-xs">{label}</label>
      {children}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary ${className}`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary resize-y ${className}`}
    />
  );
}

// ── Editor for one typed block ────────────────────────
// Renders the right field set for each block type, calling update on change.

function BlockBody({ block, update }: { block: ContentBlock; update: (b: ContentBlock) => void }) {
  switch (block.type) {
    case "paragraph":
      return (
        <TextArea
          value={block.text}
          onChange={(e) => update({ ...block, text: e.target.value })}
          placeholder="Markdown paragraph..."
          rows={3}
        />
      );
    case "image":
      return (
        <div className="space-y-sm">
          <Field label="Image URL"><TextInput value={block.src} onChange={(e) => update({ ...block, src: e.target.value })} placeholder="https://..." /></Field>
          <Field label="Alt text"><TextInput value={block.alt} onChange={(e) => update({ ...block, alt: e.target.value })} /></Field>
          <Field label="Caption (optional)"><TextInput value={block.caption || ""} onChange={(e) => update({ ...block, caption: e.target.value })} /></Field>
        </div>
      );
    case "horizontalRule":
      return <p className="font-dm-sans text-xs text-on-surface-muted italic">Section divider — no fields.</p>;
    case "videoCallout":
      return (
        <div className="space-y-sm">
          <Field label="Title"><TextInput value={block.title} onChange={(e) => update({ ...block, title: e.target.value })} /></Field>
          {block.links.map((l, li) => (
            <div key={li} className="flex gap-sm items-center">
              <Field label="Label">
                <TextInput
                  value={l.label}
                  onChange={(e) => {
                    const links = [...block.links];
                    links[li] = { ...links[li], label: e.target.value };
                    update({ ...block, links });
                  }}
                  placeholder="Watch on YouTube"
                />
              </Field>
              <Field label="URL">
                <TextInput
                  value={l.url}
                  onChange={(e) => {
                    const links = [...block.links];
                    links[li] = { ...links[li], url: e.target.value };
                    update({ ...block, links });
                  }}
                  placeholder="https://..."
                />
              </Field>
              <button
                onClick={() => update({ ...block, links: block.links.filter((_, j) => j !== li) })}
                className="mt-md p-sm text-on-surface-muted hover:text-error shrink-0"
                title="Remove link"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => update({ ...block, links: [...block.links, { label: "", url: "" }] })}
            className="inline-flex items-center gap-sm text-xs text-primary font-dm-sans"
          >
            <Plus className="w-3 h-3" /> Add link
          </button>
        </div>
      );
    case "callout":
      return (
        <div className="space-y-sm">
          <Field label="Variant">
            <select
              value={block.variant}
              onChange={(e) => update({ ...block, variant: e.target.value as "success" | "danger" | "warning" | "info" })}
              className="w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
            >
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="danger">Danger</option>
            </select>
          </Field>
          <Field label="Title (optional)"><TextInput value={block.title || ""} onChange={(e) => update({ ...block, title: e.target.value })} /></Field>
          <Field label="Text (markdown)"><TextArea value={block.text} onChange={(e) => update({ ...block, text: e.target.value })} rows={3} /></Field>
        </div>
      );
    case "code":
      return (
        <div className="space-y-sm">
          <div className="grid grid-cols-2 gap-sm">
            <Field label="Language"><TextInput value={block.language || ""} onChange={(e) => update({ ...block, language: e.target.value })} placeholder="typescript" /></Field>
            <Field label="Filename (optional)"><TextInput value={block.filename || ""} onChange={(e) => update({ ...block, filename: e.target.value })} placeholder="src/index.ts" /></Field>
          </div>
          <Field label="Code"><TextArea value={block.code} onChange={(e) => update({ ...block, code: e.target.value })} rows={6} className="font-mono" /></Field>
        </div>
      );
    case "math":
      return (
        <div className="space-y-sm">
          <Field label="LaTeX expression"><TextArea value={block.expression} onChange={(e) => update({ ...block, expression: e.target.value })} rows={3} placeholder="x^2 + y^2 = z^2" /></Field>
          <label className="flex items-center gap-sm cursor-pointer">
            <input
              type="checkbox"
              checked={block.display !== false}
              onChange={(e) => update({ ...block, display: e.target.checked })}
              className="accent-primary"
            />
            <span className="font-dm-sans text-xs text-on-surface-muted">Display (block) mode</span>
          </label>
        </div>
      );
    case "mermaid":
      return (
        <div className="space-y-sm">
          <Field label="Diagram source (mermaid syntax)"><TextArea value={block.diagram} onChange={(e) => update({ ...block, diagram: e.target.value })} rows={6} className="font-mono" placeholder="graph TD&#10;  A --&gt; B" /></Field>
          <Field label="Caption (optional)"><TextInput value={block.caption || ""} onChange={(e) => update({ ...block, caption: e.target.value })} /></Field>
        </div>
      );
    case "youtube":
      return (
        <div className="space-y-sm">
          <Field label="Video ID (the part after v=)"><TextInput value={block.videoId} onChange={(e) => update({ ...block, videoId: e.target.value })} placeholder="dQw4w9WgXcQ" /></Field>
          <Field label="Caption (optional)"><TextInput value={block.caption || ""} onChange={(e) => update({ ...block, caption: e.target.value })} /></Field>
        </div>
      );
    case "chart":
    case "scene3d":
    case "lab": {
      const [json, setJson] = useState(() => JSON.stringify(block, null, 2));
      return (
        <div className="space-y-sm">
          <Field label={`${block.type} JSON (see ChartNode/SceneObject/LabBlock types)`}>
            <TextArea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={8}
              className="font-mono"
            />
          </Field>
          <div className="flex items-center gap-sm">
            <button
              onClick={() => {
                try {
                  const parsed = JSON.parse(json);
                  if (!isKnownBlock(parsed)) throw new Error("not a known block type");
                  update(parsed);
                } catch (err) {
                  window.alert(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
                }
              }}
              className="px-md py-sm bg-surface border border-border-default text-on-surface font-sora text-xs uppercase tracking-widest hover:border-primary transition-colors"
            >
              Apply JSON
            </button>
            <span className="font-dm-sans text-xs text-on-surface-muted">Chart/scene/lab use a primitive tree — edit the JSON directly.</span>
          </div>
        </div>
      );
    }
  }
}

// ── Main editor ───────────────────────────────────────

export default function BlockEditor({ blocks, onChange }: BlockItemEditorProps) {
  const [adding, setAdding] = useState<SimpleBlock | JsonBlock | null>(null);

  const updateAt = (i: number, block: string | ContentBlock) => {
    const next = [...blocks];
    next[i] = block;
    onChange(next);
  };

  const removeAt = (i: number) => {
    onChange(blocks.filter((_, j) => j !== i));
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const addBlock = (kind: SimpleBlock | JsonBlock) => {
    onChange([...blocks, emptyBlock(kind)]);
    setAdding(null);
  };

  return (
    <div className="space-y-md">
      {blocks.length === 0 && (
        <p className="font-dm-sans text-xs text-on-surface-muted italic">
          No content yet. Add a paragraph or a rich block below.
        </p>
      )}

      {blocks.map((block, i) => (
        <div key={i} className="p-md bg-surface-container border border-border-default">
          <div className="flex items-center justify-between mb-sm">
            <div className="flex items-center gap-sm">
              <GripVertical className="w-4 h-4 text-on-surface-muted shrink-0" />
              <span className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">
                {typeof block === "string" ? `Paragraph (markdown) #${i + 1}` : `Block: ${block.type}`}
              </span>
            </div>
            <div className="flex items-center gap-xs">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="p-sm text-on-surface-muted hover:text-on-surface disabled:opacity-30" title="Move up">
                <ChevronUp className="w-4 h-4" />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === blocks.length - 1} className="p-sm text-on-surface-muted hover:text-on-surface disabled:opacity-30" title="Move down">
                <ChevronDown className="w-4 h-4" />
              </button>
              <button onClick={() => removeAt(i)} className="p-sm text-on-surface-muted hover:text-error" title="Remove">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {typeof block === "string" ? (
            <TextArea
              value={block}
              onChange={(e) => updateAt(i, e.target.value)}
              placeholder="Markdown paragraph..."
              rows={3}
            />
          ) : (
            <BlockBody block={block} update={(b) => updateAt(i, b)} />
          )}
        </div>
      ))}

      {/* Add block menu */}
      <div>
        {adding === null ? (
          <button
            onClick={() => setAdding("paragraph")}
            className="inline-flex items-center gap-sm text-sm text-primary hover:text-primary-hover font-dm-sans"
          >
            <Plus className="w-4 h-4" /> Add paragraph
          </button>
        ) : null}
        <div className="flex flex-wrap gap-sm mt-md">
          {ADDABLE.map((item) => (
            <button
              key={item.kind}
              onClick={() => addBlock(item.kind)}
              className={`inline-flex items-center gap-sm px-md py-sm font-sora text-xs uppercase tracking-widest border transition-colors ${
                adding === item.kind
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface text-on-surface-muted border-border-default hover:border-outline"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAdding(null)}
          className="mt-sm text-xs text-on-surface-muted hover:text-on-surface font-dm-sans underline"
        >
          Collapse menu
        </button>
      </div>
    </div>
  );
}
