// Plain constants (safe to import from server actions and client components).

/** Brand palette offered in the group color picker. */
export const GROUP_COLORS = ["#E30613", "#FF6B4A", "#FFB400", "#5CAE2E", "#2BB673", "#00A3A3", "#1E9BD7", "#7C4DFF", "#E8457C", "#64748B"] as const;

/** Icon keys offered in the group icon picker (mapped to lucide icons in group-icon.tsx). */
export const GROUP_ICONS = ["star", "compass", "mountain", "rocket", "music", "palette", "heart", "sun", "leaf", "trophy", "book", "globe", "flag", "tent", "sparkles", "smile"] as const;
export type GroupIconKey = (typeof GROUP_ICONS)[number];
