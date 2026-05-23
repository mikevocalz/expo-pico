// Haptics wrapper. Maps semantic feedback names to durations/amplitudes
// so call sites don't reach for raw millisecond values. No-ops cleanly
// when expo-pico-core's haptic bridge can't reach the Pico Native SDK's
// PXR_Plugin.UPxr_VibrateController.

import { getPicoCapabilities } from './picoCapabilities';

export type HapticHand = 'left' | 'right' | 'both';

type HapticPattern = { amplitude: number; durationMs: number };

const PATTERNS: Record<string, HapticPattern> = {
  // Subtle touch — for hover entry, finger-grazing a button.
  tap: { amplitude: 0.35, durationMs: 30 },
  // Confirmation — successful click / drop / select.
  confirm: { amplitude: 0.7, durationMs: 80 },
  // Stronger signal — error, boundary violation, "you cannot".
  warn: { amplitude: 0.9, durationMs: 140 },
  // Drag start — a brief click as the user grabs.
  grab: { amplitude: 0.55, durationMs: 60 },
  // Drag release — slightly softer than confirm.
  drop: { amplitude: 0.5, durationMs: 50 },
};

let warned = false;
function warnOnce() {
  if (warned) return;
  warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[pico] haptics: bridge unavailable (PICO Native SDK AAR not on classpath). ' +
      'Calls will no-op. Drop pico-native-sdk-*.aar into android/app/libs/ and rebuild.',
  );
}

async function pulse(hand: HapticHand, p: HapticPattern): Promise<void> {
  if (!getPicoCapabilities().haptics) {
    warnOnce();
    return;
  }
  try {
    const core = require('@expo-pico/core');
    await core.pulseHaptic?.(hand, p.amplitude, p.durationMs);
  } catch {
    // bridge rejected — likely SDK absent. Swallow silently after the
    // boot-time warning; we don't want haptic failures to bubble into
    // app code.
  }
}

export const haptics = {
  tap: (hand: HapticHand = 'both') => pulse(hand, PATTERNS.tap),
  confirm: (hand: HapticHand = 'both') => pulse(hand, PATTERNS.confirm),
  warn: (hand: HapticHand = 'both') => pulse(hand, PATTERNS.warn),
  grab: (hand: HapticHand = 'both') => pulse(hand, PATTERNS.grab),
  drop: (hand: HapticHand = 'both') => pulse(hand, PATTERNS.drop),
  pulse: (hand: HapticHand, amplitude: number, durationMs: number) =>
    pulse(hand, { amplitude, durationMs }),
  isAvailable: () => getPicoCapabilities().haptics,
};
