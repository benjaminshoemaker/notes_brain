/**
 * Warm Ink Design System
 *
 * Personality: Warmth & Approachability (Notion / Apple Notes)
 * Foundation: Warm neutrals — cream background, warm grays, ink-black text
 * Depth: Subtle single shadows + surface color shifts
 * Accent: Indigo (#4F46E5)
 */

export const colors = {
  // Foundations
  background: "#FAF8F5",
  surface: "#FFFFFF",
  surfaceRaised: "#F5F2EE",
  border: "#E8E4DF",
  borderSubtle: "#F0ECE7",

  // Text
  text: "#1C1917",
  textSecondary: "#57534E",
  textMuted: "#6B625C",
  textInverse: "#FFFFFF",

  // Accent
  accent: "#4F46E5",
  accentLight: "#EEF2FF",
  accentHover: "#4338CA",

  // Semantic
  success: "#15803D",
  successLight: "#F0FDF4",
  error: "#B91C1C",
  errorLight: "#FEF2F2",
  warning: "#B45309",
  warningLight: "#FFFBEB",
} as const;

export type CategoryTint = { bg: string; text: string };

export const categoryTints: Record<string, CategoryTint> = {
  ideas: { bg: "#F5F3FF", text: "#6D28D9" },
  projects: { bg: "#EFF6FF", text: "#1D4ED8" },
  family: { bg: "#FFF7ED", text: "#9A3412" },
  friends: { bg: "#FDF2F8", text: "#BE185D" },
  health: { bg: "#F0FDF4", text: "#15803D" },
  admin: { bg: "#FFFBEB", text: "#92400E" },
  uncategorized: { bg: "#F5F5F4", text: "#57534E" },
  pending: { bg: "#F5F5F4", text: "#57534E" },
};

export const lensAccentColors = [
  colors.accent,
  "#16A34A",
  "#D97706",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#6366F1",
] as const;

export function getCategoryTint(category: string): CategoryTint {
  return categoryTints[category] ?? categoryTints.uncategorized;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  screenTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  badge: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
} as const;

export const touchTargets = {
  min: 48,
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  pill: 20,
} as const;

export const shadows = {
  sm: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;
