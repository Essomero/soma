// Normalizes Gemini and OpenAI-compatible provider errors for the client.

export function extractErrorMessage(raw, status) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error?.message) return parsed.error.message;
  } catch {}
  if (status === 429) return "Rate limit exceeded : try again later or switch models.";
  if (status === 401 || status === 403) return "Invalid or missing API key.";
  return `AI service error (HTTP ${status})`;
}
