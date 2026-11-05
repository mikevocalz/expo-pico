/**
 * Flat-screen design tokens for the 2D surfaces. The XR scene has its own
 * spatial tokens in metres — these are pixels and never cross over.
 *
 * Tuned to read as PICO's own developer material rather than generic dark-mode
 * neon. Three things drive it:
 *
 *  - The wordmark is near-black (#040000 in the official SVG), so the surface
 *    it sits on has to be near-black too, not navy.
 *  - developer.picoxr.com renders its header icons in #575B66, a desaturated
 *    slate. That greenish-grey, not blue, is the secondary colour.
 *  - PICO's product photography is a graphite gradient behind a white headset.
 *    The palette borrows that: dark ground, near-white type, and colour used
 *    only where it carries meaning.
 *
 * Accent is deliberately restrained. Status colours are the only saturated
 * values, so anything coloured on screen is reporting state — not decoration.
 */
export const palette = {
  /** Near-black, matched to the wordmark rather than a blue-black. */
  bg: '#0A0A0B',
  bgRaised: '#131316',
  bgCard: '#17171B',
  /** Hairlines. Visible on a headset panel without becoming a drawn box. */
  border: '#26262C',
  borderBright: '#34343D',
  text: '#F7F7F8',
  /** PICO's own icon slate. */
  textMuted: '#8A8F9B',
  textFaint: '#575B66',
  /** Single accent, cool white-blue — reads as instrument, not marketing. */
  accent: '#5B9DFF',
  accentDeep: '#2C6BD8',
  ok: '#3FB950',
  warn: '#D29922',
  danger: '#F85149',
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

/**
 * Type scale. PICO sets headings tight and wide-tracked in caps for labels,
 * which is what makes their material read as instrumentation.
 */
export const type = {
  display: { fontSize: 34, fontWeight: '700', letterSpacing: -0.8 },
  title: { fontSize: 20, fontWeight: '600', letterSpacing: -0.3 },
  body: { fontSize: 15, fontWeight: '400' },
  /** Wide-tracked caps for chip and section labels. */
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  mono: { fontSize: 12, fontWeight: '500' },
} as const;

/**
 * The spatial shell's sizes in dp (rail, main, detail; see
 * `src/layout/shell.ts`). The rail is a 64dp destination slot plus label
 * room, so every target clears Meta's 48dp minimum; the detail panel is a
 * portrait 420x600, inside Meta's 384-1440dp panel range and not square, which
 * PICO OS 5 needs.
 */
export const shellSize = {
  railWidth: 96,
  railItem: 72,
  /** The selected-item indicator: a square with radius.sm corners. */
  railIndicator: 40,
  railPadding: space.sm + 4,
  detailWidth: 420,
  detailHeight: 600,
  /**
   * The main panel's launch size on headsets, as app.config.ts declares it
   * (defaultWidth/defaultHeight). Its aspect is the one MainContentFrame keeps.
   */
  mainWidth: 1280,
  mainHeight: 800,
  /** The bottom tab bar on phones. */
  tabBarHeight: 64,
} as const;
