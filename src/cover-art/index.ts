// ── Cover Art Registry ──────────────────────────────────
// LLM-authored SVG art, one file per collection. An entry here replaces
// the seeded geometric motif on that collection's print front cover.
// Collections without an entry keep the deterministic motif fallback,
// so art can land incrementally without breaking anything.
//
// Contract every file MUST follow (light, ink-safe, cohesive set):
// - viewBox="0 0 400 240", transparent background (paper shows through)
// - flat fills only, no gradients, no filters, no raster images
// - strokes 1.5px or wider (print legibility)
// - palette: ink #0f172a, blue #2563eb, green #16a34a, plus ONE accent
//   per piece from: amber #d97706, violet #7c3aed, teal #0d9488,
//   rose #e11d48
// - no <text>, no external refs, no script, no <style>
// - 6KB or smaller per file (print chunk budget)

/** Raw SVG markup keyed by collection slug. Absent = motif fallback. */
export const coverArt: Record<string, string> = {};

export function artFor(slug: string): string | undefined {
  return coverArt[slug];
}
