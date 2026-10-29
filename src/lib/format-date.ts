/**
 * Formats a UTC ISO 8601 date string to "Month Day, Year" format
 * using en-US locale. Example: "October 29, 2026"
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
