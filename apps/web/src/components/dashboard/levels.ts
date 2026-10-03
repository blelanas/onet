// Gamification levels for kids. Pure helpers shared by dashboards and the achievements page.
export const POINTS_PER_LEVEL = 100;
export const LEVEL_COLORS = ["#2BB673", "#1E9BD7", "#7C4DFF", "#FF6B4A", "#E30613", "#FFB400"];
export const MAX_NAMED_LEVEL = 6;

export function levelFor(points: number) {
  const p = Math.max(0, points);
  const level = Math.floor(p / POINTS_PER_LEVEL) + 1;
  const into = p % POINTS_PER_LEVEL;
  return {
    level,
    /** i18n key suffix for the level title (levels.names.<n>) */
    nameKey: String(Math.min(level, MAX_NAMED_LEVEL)),
    into,
    toNext: POINTS_PER_LEVEL - into,
    pct: Math.round((into / POINTS_PER_LEVEL) * 100),
    color: LEVEL_COLORS[(Math.min(level, MAX_NAMED_LEVEL) - 1) % LEVEL_COLORS.length],
  };
}

/** First day (Monday 00:00) of the current week (same rule as the API's dashboards). */
export function startOfWeek(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
