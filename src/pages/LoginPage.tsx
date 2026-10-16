import { useState, useEffect, useMemo } from "react";
import { Lock } from "lucide-react";

interface LoginPageProps {
  onLogin: (password: string) => Promise<string | null>;
}

// Generate a stable grid of "cards" that don't change on re-render
const GRID_COLS = 6;
const GRID_ROWS = 4;

function BackgroundGrid() {
  const cards = useMemo(() => {
    const items = [];
    const gradients = [
      "from-primary/20 to-secondary/10",
      "from-secondary/15 to-primary/5",
      "from-accent-orange/10 to-primary/15",
      "from-tertiary/15 to-secondary/5",
      "from-primary/10 to-accent-orange/10",
      "from-secondary/20 to-tertiary/10",
    ];
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      items.push({
        id: i,
        gradient: gradients[i % gradients.length],
        delay: `${(i * 0.3) % 3}s`,
        opacity: 0.15 + (i % 3) * 0.08,
      });
    }
    return items;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-surface/80 to-background" />

      {/* Card grid */}
      <div
        className="absolute inset-0 grid gap-4 p-8 opacity-40"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
        }}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            className={`rounded-xl bg-gradient-to-br ${card.gradient} border border-primary/5`}
            style={{
              opacity: card.opacity,
              animation: `fadeIn ${2 + (card.id % 3)}s ease-out ${card.delay} both`,
            }}
          />
        ))}
      </div>

      {/* Top gradient fade */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-background via-background/60 to-transparent" />
      {/* Bottom gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/60 to-transparent" />

      {/* Subtle noise/shine overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 40%, ${"#b8c3ff"} 0%, transparent 50%),
                           radial-gradient(circle at 70% 60%, ${"#47e175"} 0%, transparent 50%)`,
        }}
      />
    </div>
  );
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError(null);
    const err = await onLogin(password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <BackgroundGrid />

      <div className="relative z-10 max-w-md w-full text-center px-gutter">
        <div className="mb-xxl">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-lg backdrop-blur-sm">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-sora text-headline-md text-on-surface mb-sm">
            Soma
          </h1>
          <p className="font-dm-sans text-body-base text-on-surface-muted">
            A personal library of ideas. Enter to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-md">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full bg-surface/80 backdrop-blur-sm border border-border-default rounded-lg px-xl py-md font-dm-sans text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
          {error && (
            <p className="font-dm-sans text-sm text-error">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary font-sora text-label-caps uppercase tracking-widest py-md rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Checking..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
