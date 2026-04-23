import * as fs from 'fs';
import * as path from 'path';

/**
 * Light-touch integrity check for `expo-pico-template`.
 *
 * The template is consumed via `npx create-expo-app --template
 * expo-pico-template`. If any of these invariants break silently,
 * consumers end up with a broken bootstrap and no clear error.
 *
 * Kept inside expo-pico-core's test suite because:
 *   1. The template is where the core plugin's public surface is
 *      actually exercised — a breaking change in core's option
 *      names could easily skip the template's static wiring.
 *   2. expo-pico-core is the only package with a running Jest config;
 *      the template itself has no test harness (it's static files).
 */

const TEMPLATE_ROOT = path.resolve(__dirname, '..', '..', 'expo-pico-template');

describe('expo-pico-template integrity', () => {
  it('directory exists', () => {
    expect(fs.existsSync(TEMPLATE_ROOT)).toBe(true);
  });

  it('ships the core files the template needs at bootstrap', () => {
    const required = [
      'package.json',
      'LICENSE',
      'README.md',
      'App.tsx',
      'app.config.ts',
      'babel.config.js',
      'tsconfig.json',
      'index.js',
      '.gitignore',
    ];
    for (const f of required) {
      expect(fs.existsSync(path.join(TEMPLATE_ROOT, f))).toBe(true);
    }
  });

  it('package.json is valid JSON and lists expo-pico-core as a dependency', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(TEMPLATE_ROOT, 'package.json'), 'utf8')
    );
    expect(pkg.name).toBe('expo-pico-template');
    expect(pkg.dependencies['expo-pico-core']).toBeDefined();
    expect(pkg.dependencies.expo).toBeDefined();
    expect(pkg.dependencies.react).toBeDefined();
    expect(pkg.dependencies['react-native']).toBeDefined();
    expect(pkg.publishConfig?.access).toBe('public');
  });

  it('app.config.ts registers the expo-pico-core plugin with xrMode + appType + buildVariant', () => {
    const cfg = fs.readFileSync(path.join(TEMPLATE_ROOT, 'app.config.ts'), 'utf8');
    expect(cfg).toContain("'expo-pico-core'");
    expect(cfg).toMatch(/xrMode:\s*'pico-(os6|swan)'/);
    expect(cfg).toMatch(/appType:\s*'(vr|mr|2d)'/);
    expect(cfg).toMatch(/buildVariant:\s*'(pico|dual|mobile)'/);
    expect(cfg).toContain('newArchEnabled: true');
  });

  it('App.tsx imports the core runtime API that its HUD displays', () => {
    const app = fs.readFileSync(path.join(TEMPLATE_ROOT, 'App.tsx'), 'utf8');
    expect(app).toContain("from 'expo-pico-core'");
    expect(app).toContain('getPicoRuntimeInfo');
    expect(app).toContain('getPicoDiagnostics');
    expect(app).toContain('getPlatformSdkProbe');
  });

  it('files whitelist covers everything the template needs at bootstrap', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(TEMPLATE_ROOT, 'package.json'), 'utf8')
    );
    const needed = ['App.tsx', 'app.config.ts', 'babel.config.js', 'tsconfig.json', 'index.js', '.gitignore'];
    for (const f of needed) {
      expect(pkg.files).toContain(f);
    }
  });

  it('does not bundle artwork the template intentionally omits', () => {
    // Unbranded placeholder icons routinely make it into PICO Store
    // submissions. Verify the template's app.config doesn't reference
    // a file we don't ship.
    const cfg = fs.readFileSync(path.join(TEMPLATE_ROOT, 'app.config.ts'), 'utf8');
    // Matches only a non-commented `icon:` / `splash:` declaration.
    expect(cfg).not.toMatch(/^\s*icon:\s*['"]/m);
    expect(cfg).not.toMatch(/^\s*splash:\s*\{/m);
  });
});
