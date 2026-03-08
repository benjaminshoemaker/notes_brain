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
  textMuted: "#A8A29E",
  textInverse: "#FFFFFF",

  // Accent
  accent: "#4F46E5",
  accentLight: "#EEF2FF",
  accentHover: "#4338CA",

  // Semantic
  success: "#16A34A",
  successLight: "#F0FDF4",
  error: "#DC2626",
  errorLight: "#FEF2F2",
  warning: "#D97706",
  warningLight: "#FFFBEB",
} as const;

export type CategoryTint = { bg: string; text: string };

export const categoryTints: Record<string, CategoryTint> = {
  task: { bg: "#EFF6FF", text: "#2563EB" },
  idea: { bg: "#F5F3FF", text: "#7C3AED" },
  journal: { bg: "#F0FDF4", text: "#16A34A" },
  reference: { bg: "#FFFBEB", text: "#D97706" },
  uncategorized: { bg: "#F5F5F4", text: "#78716C" },
  pending: { bg: "#F5F5F4", text: "#78716C" },
};

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
