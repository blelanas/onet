// Plain constants (safe to import from server actions and client components).

/**
 * Palette offered in the group color picker, and the only colours a group may be saved with
 * (mirrors apps/web/src/components/groups/constants.ts). Group colours are categorical, so red
 * stays: it is the schema default and what existing groups store — dropping it would make their
 * next edit recolour them. Never remove a colour; append new ones at the end.
 */
export const GROUP_COLORS = ["#E30613", "#FF6B4A", "#FFB400", "#5CAE2E", "#2BB673", "#00A3A3", "#1E9BD7", "#7C4DFF", "#E8457C", "#64748B", "#0F7A3E"] as const;

/** Icon keys offered in the group icon picker (mapped to lucide icons in group-icon.tsx). */
export const GROUP_ICONS = ["star", "compass", "mountain", "rocket", "music", "palette", "heart", "sun", "leaf", "trophy", "book", "globe", "flag", "tent", "sparkles", "smile"] as const;
export type GroupIconKey = (typeof GROUP_ICONS)[number];
