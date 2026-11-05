import * as fs from 'fs';
import * as path from 'path';

import { PICO_FEATURES } from '../plugin/src/constants';
import { PICO_EYE_TRACKING_FEATURES } from '../src/eyeTrackingPermission';

// The plugin writes the PICO eye tracking uses-feature; the runtime asks
// PackageManager for it before prompting, and the Kotlin capability snapshot
// reads it back. PICO's docs name the permission
// (com.picovr.permission.EYE_TRACKING) but no uses-feature string, so the
// runtime accepts both names in use here and the plugin's name comes first.

const HYBRID = fs.readFileSync(
  path.join(__dirname, '..', 'android', 'src', 'nitro', 'HybridPicoCore.kt'),
  'utf8'
);

describe('PICO eye tracking feature name', () => {
  it('the runtime checks the name the plugin declares, first', () => {
    expect(PICO_EYE_TRACKING_FEATURES[0]).toBe(PICO_FEATURES.EYE_TRACKING);
  });

  it('the runtime also accepts picovr.software.eye_tracking', () => {
    expect(PICO_EYE_TRACKING_FEATURES).toContain('picovr.software.eye_tracking');
  });

  it('the Kotlin capability snapshot uses the same names in the same order', () => {
    const list = HYBRID.match(/PICO_EYE_TRACKING_FEATURES\s*=\s*listOf\(([^)]*)\)/);
    expect(list).not.toBeNull();
    const names = [...(list?.[1] ?? '').matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(names).toEqual([...PICO_EYE_TRACKING_FEATURES]);
    expect(HYBRID).toMatch(/EYETRACKING -> PICO_EYE_TRACKING_FEATURES\.first\(\)/);
  });
});
