/**
 * Global model preference persisted in localStorage.
 *
 * Every ModelPicker resolves its default through here, so a model
 * picked once sticks across the whole app (admin panels, comments,
 * inline AI, test evaluation) — no re-selecting per panel.
 */

const KEY_MODEL = "soma.model.v1";

/** App-wide fallback before any model list has loaded. */
export const DEFAULT_MODEL_ID = "deepseek-flash";

export function readModelPref(): string | null {
  try {
    return localStorage.getItem(KEY_MODEL);
  } catch {
    return null;
  }
}

export function writeModelPref(id: string): void {
  try {
    localStorage.setItem(KEY_MODEL, id);
  } catch {
    /* localStorage unavailable (private mode etc.) — no persistence,
       the picker still works for the session. */
  }
}

/**
 * Resolve the model a picker should use once its model list has loaded.
 *
 * Priority: saved global pref → current `value` (no pref) → first
 * available model ��� null.
 *
 * Returns null when the resolved choice would be the same as `value`,
 * so the caller can skip a no-op setState (avoiding the re-render).
 */
export function resolveDefaultModel(
  models: { id: string }[],
  value: string,
): string | null {
  const saved = readModelPref();
  const choice =
    (saved && models.some((m) => m.id === saved) && saved) ||
    (value && models.some((m) => m.id === value) && value) ||
    models[0]?.id ||
    null;
  return choice && choice !== value ? choice : null;
}
