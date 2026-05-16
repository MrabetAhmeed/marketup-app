/**
 * Format a date as a French relative time string.
 * e.g., "Il y a 2 heures", "Hier", "Il y a 3 jours", "12 janv. 2026"
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHour < 24) return `Il y a ${diffHour} heure${diffHour > 1 ? "s" : ""}`;
  if (diffDay === 1) return "Hier";
  if (diffDay < 7) return `Il y a ${diffDay} jours`;
  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return `Il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`;
  }

  // Older than 30 days: show short date
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
