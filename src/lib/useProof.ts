import { useState, useEffect, useCallback } from "react";

export interface ProofSummary {
  slug: string;
  highlights: number;
  comments: number;
  test_submissions: number;
  best_score: number | null;
  lab_attempts: number;
  lab_passed: number;
  notes: number;
}

export interface UseProofResult {
  proof: ProofSummary | null;
  loading: boolean;
  error: string | null;
  /** Re-fetch the proof data */
  refresh: () => void;
}

/**
 * Fetch proof-graph summary for a single content slug.
 * Aggregates highlights, comments, test submissions, lab attempts,
 * and linked notes from the server.
 */
export function useProof(slug: string): UseProofResult {
  const [proof, setProof] = useState<ProofSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const refresh = useCallback(() => {
    setRefreshCounter((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/proof?slug=${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setProof(data as ProofSummary);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, refreshCounter]);

  return { proof, loading, error, refresh };
}

export interface UseAllProofsResult {
  proofs: ProofSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetch proof-graph summaries for all slugs the owner has interacted with.
 */
export function useAllProofs(): UseAllProofsResult {
  const [proofs, setProofs] = useState<ProofSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const refresh = useCallback(() => {
    setRefreshCounter((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/proof")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setProofs(data as ProofSummary[]);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshCounter]);

  return { proofs, loading, error, refresh };
}
