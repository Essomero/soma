import { marked } from "marked";
import hljs from "highlight.js";
import katex from "katex";
import DOMPurify from "dompurify";
import type { ContentBlock } from "@/types";

/**
 * All HTML leaving this module is sanitized. Comment bodies, highlight notes,
 * and learn notes are visitor input rendered with dangerouslySetInnerHTML
 * downstream, so raw HTML, event handlers, and javascript: URLs must die here.
 * `style` stays allowed because KaTeX positions math with inline styles;
 * modern browsers no longer execute script from style. XSS here cannot read
 * the HttpOnly session cookie, but it can still ride it via same-origin
 * fetch, so sanitization stays mandatory.
 */
function clean(html: string): string {
  return DOMPurify.sanitize(html, { ADD_ATTR: ["style"] });
}

/**
 * Pre-render inline math \(...\) and block math $$...$$ into KaTeX HTML
 * before marked parses the string. This lets math flow inline within a
 * prose paragraph (no per-block breaks) and lets block equations sit
 * centered on their own line.
 *
 * Display math ($$...$$) gets wrapped in a <div> with a paragraph break
 * so marked treats it as a standalone block. Inline math \(...\) emits
 * a <span> that flows with surrounding markdown.
 */
function renderMathDelimiters(text: string): string {
  // Block math first: $$...$$ (greedy across newlines)
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_match, expr: string) => {
    try {
      const html = katex.renderToString(expr.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      // Wrap in paragraph so marked treats it as its own block element
      return `\n\n<div class="my-xl py-md text-center overflow-x-auto text-on-surface">${html}</div>\n\n`;
    } catch {
      return _match;
    }
  });

  // Display math via LaTeX bracket syntax: \[...\]
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_match, expr: string) => {
    try {
      const html = katex.renderToString(expr.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      return `\n\n<div class="my-xl py-md text-center overflow-x-auto text-on-surface">${html}</div>\n\n`;
    } catch {
      return _match;
    }
  });

  // Display math via LaTeX environment: \begin{equation}...\end{equation}
  // (and the starred/aligned variants). Strip the environment markers and
  // render the contents as display math.
  text = text.replace(
    /\\begin\{(equation\*?|align\*?|gather\*?|displaymath\*?)\}([\s\S]+?)\\end\{\1\}/g,
    (_match, _env: string, expr: string) => {
      try {
        const html = katex.renderToString(expr.trim(), {
          displayMode: true,
          throwOnError: false,
        });
        return `\n\n<div class="my-xl py-md text-center overflow-x-auto text-on-surface">${html}</div>\n\n`;
      } catch {
        return _match;
      }
    },
  );

  // Inline math: \(...\)
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_match, expr: string) => {
    try {
      const html = katex.renderToString(expr.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return `<span class="text-on-surface">${html}</span>`;
    } catch {
      return _match;
    }
  });

  // Inline math: $...$ (must run AFTER $$...$$ so display math is already gone).
  // A bare `$` is ambiguous with currency, and this site writes money all the
  // time ("$7,000 to $12,000", "$500 bug bounty or a $2,500 retainer") as well
  // as shell/SQL/yaml snippets containing `$1` or `${VAR}`. So a `$` pair only
  // counts as math when nothing else could explain it:
  //   - the body holds no newline and no further `$`,
  //   - the body contains a backslash command (\frac, \text, \times, ...),
  //   - neither delimiter touches whitespace, and the opening `$` is not the
  //     start of a `${` interpolation,
  //   - the closing `$` is not followed by a digit (that is always a price).
  // Anything else stays literal. Inline math without a command belongs in
  // \(...\), which is unambiguous.
  text = text.replace(
    /(^|[^\\])\$(?![\s${])(?=[^$\n]*\\)[^$\n]*?[^\s$]\$(?!\d)/g,
    (match, lead: string, expr: string) => {
      try {
        const html = katex.renderToString(expr.trim(), {
          displayMode: false,
          throwOnError: false,
        });
        return `${lead}<span class="text-on-surface">${html}</span>`;
      } catch {
        return match;
      }
    },
  );

  return text;
}

marked.use({
  breaks: true,
  gfm: true,
  renderer: {
    heading({ text, depth }: { text: string; depth: number }) {
      // Only ## headings with number patterns get big numeral treatment
      const match = depth === 2 ? text.match(/^(\d{1,2})\.\s+(.+)$/) : null;
      if (match) {
        const num = match[1].padStart(2, "0");
        const title = match[2];
        const id = title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
        return `<section class="mb-giant" id="${id}"><div class="flex items-center gap-md mb-xl"><span class="font-sora text-[40px] font-extrabold text-border-default">${num}</span><h2 class="font-sora text-article-title text-on-surface">${title}</h2></div>`;
      }
      // Regular heading with auto ID
      const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
      const sizes: Record<number, string> = { 1: "text-2xl", 2: "text-xl font-sora", 3: "text-lg font-sora", 4: "text-base font-sora" };
      const tag = `h${depth}`;
      return `<${tag} class="${sizes[depth] || "text-base"} text-on-surface mt-xl mb-sm" id="${id}">${text}</${tag}>`;
    },
    code({ text, lang }: { text: string; lang?: string }) {
      const highlighted = (() => {
        try {
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(text, { language: lang }).value;
          }
          return hljs.highlightAuto(text).value;
        } catch {
          return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
      })();

      const langAttr = lang ? ` language-${lang}` : "";
      const headerHtml = lang
        ? `<div class="flex items-center justify-between px-md py-sm bg-surface-container border-b border-border-default">
            <div class="flex gap-xs">
              <div class="w-3 h-3 rounded-full bg-error/40"></div>
              <div class="w-3 h-3 rounded-full bg-accent-orange/40"></div>
              <div class="w-3 h-3 rounded-full bg-secondary/40"></div>
            </div>
            <span class="font-sora text-[10px] uppercase text-on-surface-muted">${lang}</span>
          </div>`
        : "";

      return `<div class="comment-code-block my-xl bg-surface-lowest border border-border-default rounded-xl overflow-hidden">
        ${headerHtml}
        <pre class="p-lg font-mono text-sm leading-relaxed overflow-x-auto thin-scrollbar"><code class="hljs${langAttr}">${highlighted}</code></pre>
      </div>`;
    },
    table({ header, rows, align }: { header: Array<{ text: string; align: string | null }>; rows: Array<Array<{ text: string; align: string | null }>>; align: Array<string | null> }) {
      const alignClass = (a: string | null) => {
        if (a === "center") return "text-center";
        if (a === "right") return "text-right";
        return "text-left";
      };
      const renderCell = (text: string) => marked.parseInline(text, { async: false }) as string;
      const ths = header
        .map((cell, i) => {
          const scope = i === 0 ? ' scope="col"' : "";
          return `<th class="px-lg py-md font-sora text-xs uppercase tracking-widest text-primary ${alignClass(cell.align)}"${scope}>${renderCell(cell.text)}</th>`;
        })
        .join("");
      const trs = rows
        .map((row, ri) => {
          const tds = row
            .map((cell, ci) => `<td class="px-lg py-md font-dm-sans text-sm text-on-surface ${alignClass(cell.align)}">${renderCell(cell.text)}</td>`)
            .join("");
          const rowBg = ri % 2 === 0 ? "bg-transparent" : "bg-primary/[0.04]";
          return `<tr class="border-b border-border-default/20 last:border-b-0 ${rowBg} hover:bg-primary/10 transition-colors">${tds}</tr>`;
        })
        .join("");
      return `<div class="my-xl rounded-xl border border-border-default border-t-2 border-t-primary overflow-hidden shadow-sm">
        <div class="overflow-x-auto thin-scrollbar">
          <table class="w-full border-collapse">
            <thead><tr class="bg-primary/10 border-b border-primary/20">${ths}</tr></thead>
            <tbody>${trs}</tbody>
          </table>
        </div>
      </div>`;
    },
  },
});

/** Parse inline markdown : handles **bold**, *italic*, [links](url), `code` */
export function md(text: string): string {
  return clean(marked.parseInline(renderMathDelimiters(text), { async: false }) as string);
}

/** Parse block markdown : full GFM: headings, lists, code blocks, tables, etc. */
export function mdBlock(text: string): string {
  return clean(marked.parse(renderMathDelimiters(text), { async: false }) as string);
}

/** Serialize a single ContentBlock to markdown for copy-as-markdown. */
function blockToMarkdown(block: ContentBlock): string {
  switch (block.type) {
    case "paragraph":
      return block.text;
    case "image":
      return `![${block.alt}](${block.src})${block.caption ? `\n\n*${block.caption}*` : ""}`;
    case "horizontalRule":
      return "---";
    case "code": {
      const info = [block.language, block.filename].filter(Boolean).join(" ");
      return "```" + info + "\n" + block.code + "\n```";
    }
    case "math":
      return block.display ? `$$\n${block.expression}\n$$` : `$${block.expression}$`;
    case "mermaid":
      return "```mermaid\n" + block.diagram + "\n```" + (block.caption ? `\n\n*${block.caption}*` : "");
    case "youtube":
      return `[Watch on YouTube](https://www.youtube.com/watch?v=${block.videoId})${block.caption ? `\n\n*${block.caption}*` : ""}`;
    case "videoCallout": {
      const links = block.links.map((l) => `**[${l.label}](${l.url})**`).join("  ");
      return `> ${block.title}\n> ${links}`;
    }
    case "callout": {
      const quoted = block.text.split("\n").map((l) => `> ${l}`).join("\n");
      return `> [!${block.variant.toUpperCase()}]${block.title ? ` ${block.title}` : ""}\n${quoted}`;
    }
    case "chart":
      return [block.title, block.caption].filter(Boolean).map((t) => `*${t}*`).join("\n\n");
    case "scene3d":
      return block.caption ? `*${block.caption}*` : "";
    case "lab":
      // Labs are hands-on workspace drills that live in the companion repo,
      // not part of the narrative prose when copying the article.
      return "";
  }
}

/** Convert article content to a clean markdown string for sharing with LLMs */
export function contentToMarkdown(opts: {
  title: string;
  intro?: string;
  body?: string | string[];
  sections?: { heading: string; paragraphs: (string | ContentBlock)[] }[];
  references?: { title: string; url: string }[];
}): string {
  const lines: string[] = [];
  lines.push(`# ${opts.title}`);
  lines.push("");
  if (opts.intro) {
    lines.push(opts.intro);
    lines.push("");
  }
  if (opts.body) {
    const bodyText = Array.isArray(opts.body) ? opts.body.join("\n\n") : opts.body;
    lines.push(bodyText);
    lines.push("");
  }
  if (opts.sections && opts.sections.length > 0) {
    for (const section of opts.sections) {
      lines.push(`## ${section.heading}`);
      lines.push("");
      const text = section.paragraphs
        .filter((p) => typeof p === "string" || p.type !== "lab")
        .map((p) => (typeof p === "string" ? p : blockToMarkdown(p)))
        .filter(Boolean)
        .join("\n\n");
      if (text) {
        lines.push(text);
        lines.push("");
      }
    }
  }
  if (opts.references && opts.references.length > 0) {
    lines.push("## References");
    lines.push("");
    opts.references.forEach((ref, i) => {
      lines.push(`${i + 1}. [${ref.title}](${ref.url})`);
    });
  }
  return lines.join("\n");
}
