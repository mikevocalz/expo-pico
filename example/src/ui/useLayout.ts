import { useWindowDimensions } from 'react-native';

/**
 * PICO renders the 2D activity into a WindowContainer panel, not a phone
 * viewport — expect roughly 1000-1600dp wide in shared space. Meta Horizon
 * opens it as a 1280x800dp landscape panel (app.config.ts). Phone-shaped
 * layout stretched to that width looks broken, so every 2D surface picks a
 * breakpoint instead of assuming a single column.
 */
export type Breakpoint = 'compact' | 'medium' | 'expanded';

export type Layout = {
  bp: Breakpoint;
  width: number;
  height: number;
  /** Two-column hero + actions once there is room for it. */
  twoColumn: boolean;
  /** Caps line length on wide panels — text stays readable, not edge-to-edge. */
  maxContentWidth: number;
  gutter: number;
  heroSize: number;
  titleSize: number;
  bodySize: number;
};

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();

  const bp: Breakpoint = width >= 1100 ? 'expanded' : width >= 700 ? 'medium' : 'compact';
  const expanded = bp === 'expanded';
  const medium = bp === 'medium';
  // A landscape headset panel (Horizon's 1280x800dp default) is wide but
  // short: a 208dp hero plus the title would push the CTA below the fold, so
  // the hero shrinks when height, not width, is the constraint.
  const short = height < 900 && bp !== 'compact';

  return {
    bp,
    width,
    height,
    twoColumn: expanded || medium,
    maxContentWidth: expanded ? 1180 : medium ? 860 : 560,
    gutter: short ? 32 : expanded ? 48 : medium ? 32 : 24,
    heroSize: short ? 96 : expanded ? 208 : medium ? 172 : 132,
    titleSize: short ? 40 : expanded ? 52 : medium ? 42 : 34,
    bodySize: expanded ? 18 : medium ? 16 : 15,
  };
}
