import { useState, useCallback, useEffect, useRef } from "react";
import { Loader2, TerminalSquare, GitBranch, ShieldCheck, Hammer, X } from "lucide-react";

// ── Local agent panel ─────────────────────────────────
// Talks to the local sidecar (server/local-agent.mjs). The token is read
// through the same-origin Vite /agent proxy; everything else goes DIRECT
// to http://127.0.0.1:8765 because the Vite proxy buffers streaming POST
// responses. The agent emits CORS headers only for localhost origins.
// Production never has a sidecar, so the panel reports offline.

const AGENT_ORIGIN = "http://127.0.0.1:8765";

interface AgentHealth {
  ok: boolean;
  pid: number;
  cwd: string;
  branch: string;
  node: string;
}

export default function LocalAgentPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [health, setHealth] = useState<AgentHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [output, setOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [command, setCommand] = useState("");
  const [commitMsg, setCommitMsg] = useState("");
  const [gitStatus, setGitStatus] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  // Handshake: token → health probe
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/agent/token");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { token: string };
        if (cancelled) return;
        setToken(data.token);
        const h = await fetch(`${AGENT_ORIGIN}/agent/health`, {
          headers: { "X-Agent-Token": data.token },
        });
        if (!h.ok) throw new Error(`health ${h.status}`);
        if (!cancelled) setHealth((await h.json()) as AgentHealth);
      } catch {
        if (!cancelled) setHealth(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Stream a POST body to /agent endpoint; append chunked text to output. */
  const stream = useCallback(async (path: string, body: Record<string, unknown>) => {
    if (!token) return;
    setRunning(true);
    setOutput("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const r = await fetch(`${AGENT_ORIGIN}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Agent-Token": token },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!r.ok || !r.body) {
        const err = await r.text().catch(() => `HTTP ${r.status}`);
        setOutput(`[agent] ${err}`);
        return;
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let partial = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partial += decoder.decode(value, { stream: true });
        setOutput(partial);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setOutput((o) => o + "\n[agent] cancelled");
      } else {
        setOutput(`[agent] error: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [token]);

  const loadGitStatus = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${AGENT_ORIGIN}/agent/git/status`, {
        headers: { "X-Agent-Token": token },
      });
      if (!r.ok) return;
      const data = (await r.json()) as { status: string };
      setGitStatus(data.status);
    } catch {
      // offline
    }
  }, [token]);

  useEffect(() => {
    if (health?.ok) loadGitStatus();
  }, [health, loadGitStatus]);

  if (loading) {
    return (
      <section className="p-xl bg-surface border border-border-default">
        <p className="font-sora text-label-caps text-on-surface mb-lg">LOCAL AGENT</p>
        <div className="flex items-center gap-md text-sm text-on-surface-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> Probing local agent...
        </div>
      </section>
    );
  }

  if (!health?.ok) {
    return (
      <section className="p-xl bg-surface border border-border-default">
        <p className="font-sora text-label-caps text-on-surface mb-sm">LOCAL AGENT</p>
        <p className="font-dm-sans text-sm text-on-surface-muted">
          Offline. This panel appears only when the local sidecar is running — start it with{" "}
          <code className="bg-surface-container px-sm py-xs">npm run agent</code>, join the{" "}
          <code className="bg-surface-container px-sm py-xs">vite dev</code> proxy, and reload.
          On Vercel there is no sidecar, so this panel stays dormant.
        </p>
      </section>
    );
  }

  const busy = running;

  return (
    <section className="p-xl bg-surface border border-border-default">
      <div className="flex items-center justify-between mb-lg">
        <p className="font-sora text-label-caps text-on-surface">LOCAL AGENT</p>
        <span className="inline-flex items-center gap-sm font-sora text-xs text-success uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-success" />
          connected
          {health.branch && <span className="text-on-surface-muted">// {health.branch}</span>}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-lg">
        {/* Validate */}
        <div className="p-lg bg-surface-container border border-border-default">
          <p className="font-sora text-xs text-on-surface-muted uppercase tracking-widest mb-sm flex items-center gap-sm">
            <ShieldCheck className="w-3 h-3" /> VALIDATE
          </p>
          <p className="font-dm-sans text-xs text-on-surface-muted mb-md">
            Fast correctness checks: typecheck, content references, sitemap.
          </p>
          <button
            onClick={() => stream("/agent/validate", { targets: ["typecheck", "content"] })}
            disabled={busy}
            className="w-full px-md py-sm bg-surface border border-border-default text-on-surface font-sora text-xs uppercase tracking-widest hover:border-primary transition-colors disabled:opacity-50"
          >
            {busy ? "Running..." : "Run Checks"}
          </button>
        </div>

        {/* Git */}
        <div className="p-lg bg-surface-container border border-border-default">
          <p className="font-sora text-xs text-on-surface-muted uppercase tracking-widest mb-sm flex items-center gap-sm">
            <GitBranch className="w-3 h-3" /> COMMIT
          </p>
          <input
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            placeholder="Commit message"
            className="w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm mb-sm focus:outline-none focus:border-primary"
          />
          <div className="flex gap-sm">
            <button
              onClick={() => stream("/agent/git/commit", { message: commitMsg })}
              disabled={busy || !commitMsg.trim()}
              className="flex-1 px-md py-sm bg-primary text-on-primary font-sora text-xs uppercase tracking-widest hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              Commit All
            </button>
            <button
              onClick={() => {
                loadGitStatus();
                setOutput(gitStatus || "(clean)");
              }}
              disabled={busy}
              className="px-md py-sm bg-surface border border-border-default text-on-surface font-sora text-xs uppercase tracking-widest hover:border-primary transition-colors disabled:opacity-50"
              title="git status --short"
            >
              Status
            </button>
          </div>
        </div>

        {/* Shell */}
        <div className="p-lg bg-surface-container border border-border-default">
          <p className="font-sora text-xs text-on-surface-muted uppercase tracking-widest mb-sm flex items-center gap-sm">
            <TerminalSquare className="w-3 h-3" /> SHELL
          </p>
          <div className="flex gap-sm">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="npm run build"
              className="flex-1 p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm font-mono focus:outline-none focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); stream("/agent/exec", { command }); }
              }}
            />
            <button
              onClick={() => stream("/agent/exec", { command })}
              disabled={busy || !command.trim()}
              className="px-md py-sm bg-surface border border-border-default text-on-surface font-sora text-xs uppercase tracking-widest hover:border-primary transition-colors disabled:opacity-50"
            >
              Run
            </button>
          </div>
        </div>
      </div>

      {/* Output console */}
      <div className="relative">
        <div className="flex items-center justify-between mb-sm">
          <p className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">OUTPUT</p>
          {busy && (
            <button
              onClick={() => abortRef.current?.abort()}
              className="inline-flex items-center gap-sm text-xs text-on-surface-muted hover:text-error font-dm-sans"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          )}
        </div>
        <pre className="min-h-[120px] max-h-[360px] overflow-auto p-lg bg-background border border-border-default font-mono text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
          {output || "Run a check, commit, or command to see output here."}
        </pre>
      </div>
    </section>
  );
}