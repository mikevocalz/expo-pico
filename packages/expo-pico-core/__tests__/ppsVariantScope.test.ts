import { PPS_GROUP } from '../plugin/src/ppsArtifacts';
import { renderAppGradle } from './support/appBuildGradle';

/**
 * `xrMode` and `buildVariant` are independent options. A `pico-os5` app
 * built as `dual` still produces `mobileDebug`, `mobileRelease` and the
 * `quest*` variants, and a plain `implementation` declaration lands on all
 * of them. The PICO Platform Service SDK belongs to the PICO flavors only.
 */

/** Drop the `constraints { }` sub-block, which is deliberately unscoped. */
function withoutConstraints(gradle: string): string {
  return gradle.replace(/ {4}constraints \{[\s\S]*?\n {4}\}\n/g, '');
}

function declarations(gradle: string): string[] {
  return withoutConstraints(gradle)
    .split('\n')
    .filter((line) => line.includes(`"${PPS_GROUP}:`) || line.includes('fileTree('))
    .map((line) => line.trim());
}

describe('PICO Platform Service SDK is scoped to the PICO flavors', () => {
  it('declares nothing on the bare implementation configuration for a dual build', async () => {
    const out = await renderAppGradle({ xrMode: 'pico-os5', buildVariant: 'dual' });
    for (const line of declarations(out)) {
      expect(line.startsWith('implementation ')).toBe(false);
    }
  });

  it('declares every service and the libs fileTree on both PICO flavors for a dual build', async () => {
    const out = await renderAppGradle({ xrMode: 'pico-os5', buildVariant: 'dual' });
    for (const configuration of ['picoImplementation', 'dualImplementation']) {
      expect(out).toContain(`    ${configuration} "${PPS_GROUP}:platform-service-auth:`);
      expect(out).toContain(`    ${configuration} fileTree(`);
    }
  });

  it('omits dualImplementation for a pico build, where the dual flavor does not exist', async () => {
    const out = await renderAppGradle({ xrMode: 'pico-os5', buildVariant: 'pico' });
    expect(out).toContain(`    picoImplementation "${PPS_GROUP}:platform-service-auth:`);
    expect(out).not.toContain('dualImplementation');
    for (const line of declarations(out)) {
      expect(line.startsWith('implementation ')).toBe(false);
    }
  });

  it('falls back to implementation when no device flavors are generated', async () => {
    // `buildVariant: 'mobile'` emits `missingDimensionStrategy` instead of
    // productFlavors, so `picoImplementation` would not resolve.
    const out = await renderAppGradle({ xrMode: 'pico-os5', buildVariant: 'mobile' });
    expect(out).not.toContain('picoImplementation');
    expect(out).toContain(`    implementation "${PPS_GROUP}:platform-service-auth:`);
  });

  it('keeps the version constraints unscoped so the pin covers every variant', async () => {
    const out = await renderAppGradle({ xrMode: 'pico-os5', buildVariant: 'dual' });
    expect(out).toMatch(
      / {4}constraints \{\n(?: {8}implementation "com\.pico\.pps:[^\n]*\n)+ {4}\}/
    );
  });
});
