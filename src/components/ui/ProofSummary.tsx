import { type ProofSummary as ProofData } from "@/lib/useProof";

interface ProofSummaryProps {
  proof: ProofData;
  /** Show a more compact row format (for card contexts) */
  compact?: boolean;
}

/**
 * Quiet proof summary: "3 drills · 2 oral proofs · 12 notes"
 * Shows what engagement exists for a piece of content.
 * No gating — just visibility.
 */
export default function ProofSummary({ proof, compact = false }: ProofSummaryProps) {
  const parts: string[] = [];

  if (proof.lab_attempts > 0) {
    const label = proof.lab_passed === proof.lab_attempts
      ? `${proof.lab_attempts} drill${proof.lab_attempts !== 1 ? "s" : ""}`
      : `${proof.lab_passed}/${proof.lab_attempts} drills`;
    parts.push(label);
  }

  if (proof.test_submissions > 0) {
    const label = proof.best_score != null
      ? `${proof.best_score}% score`
      : `${proof.test_submissions} test${proof.test_submissions !== 1 ? "s" : ""}`;
    parts.push(label);
  }

  if (proof.highlights > 0) {
    parts.push(`${proof.highlights} highlight${proof.highlights !== 1 ? "s" : ""}`);
  }

  if (proof.comments > 0) {
    parts.push(`${proof.comments} comment${proof.comments !== 1 ? "s" : ""}`);
  }

  if (proof.notes > 0) {
    parts.push(`${proof.notes} note${proof.notes !== 1 ? "s" : ""}`);
  }

  if (parts.length === 0) return null;

  return (
    <p className={compact ? "font-dm-sans text-xs text-on-surface-muted" : "font-dm-sans text-sm text-on-surface-muted"}>
      {parts.join(" · ")}
    </p>
  );
}
