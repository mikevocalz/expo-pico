import * as fs from 'fs';
import * as path from 'path';

import { PPS_GROUP, PPS_SERVICE_VERSIONS, PPS_VERSION } from '../plugin/src/ppsArtifacts';
import { withPicoProjectBuildGradle } from '../plugin/src/withPicoGradle';
import { replaceMarkedBlock } from '../plugin/src/utils';
import { renderAppGradle } from './support/appBuildGradle';
import { resolveOptions } from './support/picoOptions';

/**
 * An android/ directory prebuilt by an earlier plugin version already holds
 * the PPS blocks, at the versions that release pinned. The fixtures under
 * fixtures/pps/legacy-1.0.0/ are what the 1.0.0 pin wrote. A prebuild with
 * this release must rewrite those blocks in place, not keep them because the
 * marker is present.
 */
const LEGACY = path.join(__dirname, 'fixtures/pps/legacy-1.0.0');
const legacy = (file: string) => fs.readFileSync(path.join(LEGACY, file), 'utf8');

const PIN_MARKER = '// expo-pico-core: single-version pin for com.pico.pps:*';
const DEPS_MARKER = '// expo-pico-core: PICO Platform Service SDK (com.pico.pps:*) deps';
const LIBS_MARKER = '// expo-pico-core: auto-include app/libs/*.aar (PICO Platform SDK)';
const APP_OWNED = '// app: kept across prebuilds\next.appOwned = true\n';
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
/** The generated block that starts at `marker`, through its closing `}` line. */
const block = (gradle: string, marker: string) => {
  const start = gradle.indexOf(marker);
  return gradle.slice(start, gradle.indexOf('\n}\n', start) + 3);
};

type ProjectMod = (config: unknown) => Promise<{ modResults: { contents: string } }>;
async function renderProjectGradle(contents: string): Promise<string> {
  const config = withPicoProjectBuildGradle(
    { name: 'pico', slug: 'pico' } as never,
    resolveOptions({ xrMode: 'pico-os5' }) as never
  ) as unknown as { mods: { android: { projectBuildGradle: ProjectMod } } };
  const applied = await config.mods.android.projectBuildGradle({
    modRequest: { nextMod: (result: unknown) => result },
    modResults: { contents, language: 'groovy' },
  });
  return applied.modResults.contents;
}

describe('a prebuild over an existing android/ updates the PPS blocks', () => {
  it('replaces the old single-version resolution pin', async () => {
    const before = legacy('project-build.gradle');
    expect(before).toContain('details.useVersion "1.0.0"');

    const after = await renderProjectGradle(before);
    // compliance, entitlement and speech are still pinned to 1.0.0, so look
    // for the old single-version line rather than the version string.
    expect(after).not.toContain('useVersion "1.0.0"');
    expect(after).toContain('details.useVersion pinned');
    expect(after).toContain(`"pps_sdk_base": "${PPS_VERSION}",`);
    expect(after).toContain(`"platform-service-push": "${PPS_SERVICE_VERSIONS.push}",`);
    expect(count(after, PIN_MARKER)).toBe(1);
    // Rewritten where it was, ahead of what the app added after it.
    expect(after).toContain(APP_OWNED);
    expect(after.indexOf(PIN_MARKER)).toBeLessThan(after.indexOf(APP_OWNED));
  });

  it('replaces the old dependencies and libs blocks in app/build.gradle', async () => {
    const before = legacy('app-build.gradle');
    expect(before).toContain(`picoImplementation "${PPS_GROUP}:platform-service-auth:1.0.0"`);

    const after = await renderAppGradle({ xrMode: 'pico-os5', buildVariant: 'pico' }, before);
    expect(after).not.toMatch(/com\.pico\.pps:platform-service-auth:1\.0\.0/);
    expect(after).not.toMatch(/com\.pico\.pps:pps_sdk_base:1\.0\.0/);
    expect(after).toContain(`        implementation "${PPS_GROUP}:pps_sdk_base:${PPS_VERSION}"`);
    expect(after).toContain(
      `    picoImplementation "${PPS_GROUP}:platform-service-auth:${PPS_SERVICE_VERSIONS.auth}"`
    );
    expect(count(after, DEPS_MARKER)).toBe(1);
    expect(count(after, LIBS_MARKER)).toBe(1);
    expect(after).toContain(APP_OWNED);
  });

  it('is idempotent once the blocks are current', async () => {
    const project = await renderProjectGradle(legacy('project-build.gradle'));
    expect(await renderProjectGradle(project)).toBe(project);

    // Compare the PPS blocks only: the flavor-overlay block is re-appended at
    // the end of app/build.gradle on every prebuild, so the file as a whole
    // settles on the second run.
    const options = { xrMode: 'pico-os5', buildVariant: 'pico' } as const;
    const app = await renderAppGradle(options, legacy('app-build.gradle'));
    const again = await renderAppGradle(options, app);
    for (const marker of [DEPS_MARKER, LIBS_MARKER]) {
      expect(block(again, marker)).toBe(block(app, marker));
    }
  });
});

describe('replaceMarkedBlock', () => {
  const sample = (body: string) => `\n// marker\nfoo {\n    ${body}\n}\n`;

  it('appends the block when the marker is absent', () => {
    expect(replaceMarkedBlock('a = 1\n', '// marker', sample('new'))).toBe(
      `a = 1\n${sample('new')}`
    );
  });

  it('replaces the marked block up to its closing brace and keeps what follows', () => {
    const source = `a = 1\n${sample('old { nested }')}b = 2\n`;
    expect(replaceMarkedBlock(source, '// marker', sample('new'))).toBe(
      `a = 1\n${sample('new')}b = 2\n`
    );
  });

  it('ignores braces and quotes inside comments and strings', () => {
    const tricky = `\n// marker\n// PICO's docs say "{"\nfoo {\n    x "}"\n    y '{'\n}\n`;
    expect(replaceMarkedBlock(`a\n${tricky}b\n`, '// marker', sample('new'))).toBe(
      `a\n${sample('new')}b\n`
    );
  });

  it('throws when the marked block never closes', () => {
    expect(() => replaceMarkedBlock('\n// marker\nfoo {\n', '// marker', sample('new'))).toThrow(
      /does not close/
    );
  });
});
