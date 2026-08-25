/**
 * Flat-screen design tokens for the 2D surfaces. The XR scene has its own
 * spatial tokens in metres — these are pixels and never cross over.
 */
export const palette = {
  bg: '#07080F',
  bgRaised: '#101322',
  bgCard: '#141829',
  border: '#232842',
  borderBright: '#2E3556',
  text: '#F5F7FF',
  textMuted: '#8A91C0',
  textFaint: '#5B6088',
  accent: '#7DD3FC',
  accentDeep: '#3B82F6',
  accentWarm: '#C084FC',
  ok: '#4ADE80',
  warn: '#FBBF24',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;
