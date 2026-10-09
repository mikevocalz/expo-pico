import { resolveOptions } from '../plugin/src/types';
import { updateIdentityGate } from '../plugin/src/withPicoGradle';

const GATE = '// expo-pico-core: begin identity gate';
const pico = { xrMode: 'pico-os5', appType: 'mr', buildVariant: 'pico' } as const;

describe('updateIdentityGate', () => {
  it('fails pico/dual builds when the app ID is empty', () => {
    for (const picoAppId of [undefined, '', '   ']) {
      const out = updateIdentityGate('android {}\n', resolveOptions({ ...pico, picoAppId }));
      expect(out).toContain(GATE);
      expect(out).toContain('pre(Pico|Dual)\\w*Build');
      expect(out).toContain('throw new GradleException');
    }
    expect(updateIdentityGate('', resolveOptions({ ...pico, buildVariant: 'dual' }))).toContain(
      GATE
    );
  });

  it('a foreign ID or app key alone does not satisfy it', () => {
    const out = updateIdentityGate(
      '',
      resolveOptions({ ...pico, platformService: { picoAppKey: 'k', foreign: { picoAppId: 'f' } } })
    );
    expect(out).toContain(GATE);
  });

  it('is removed once an ID is set, and stays idempotent', () => {
    const gated = updateIdentityGate('android {}\n', resolveOptions(pico));
    expect(updateIdentityGate(gated, resolveOptions(pico))).toBe(gated);
    expect(updateIdentityGate(gated, resolveOptions({ ...pico, picoAppId: 'abc' }))).toBe(
      'android {}\n'
    );
    expect(
      updateIdentityGate(gated, resolveOptions({ ...pico, platformService: { picoAppId: 'abc' } }))
    ).toBe('android {}\n');
  });

  it('never gates mobile, 2d or non-PICO builds', () => {
    for (const o of [
      { ...pico, buildVariant: 'mobile' },
      { ...pico, xrMode: 'mobile' },
      { ...pico, appType: '2d' },
    ] as const) {
      expect(updateIdentityGate('', resolveOptions(o))).toBe('');
    }
  });
});
