#!/usr/bin/env node
"use strict";
/**
 * `expo-pico-doctor` — lint an Expo project's `app.config.{ts,js,json}`
 * against the `expo-pico-core` plugin options schema without running
 * `npx expo prebuild`. Surfaces the same diagnostics the
 * prebuild pass emits, plus a few config-shape checks that require
 * inspecting the raw plugin entry before `resolveOptions` normalizes it.
 *
 * Usage:
 *   npx expo-pico-doctor [--project <path>] [--json] [--fail-on-warning]
 *
 * Exit codes:
 *   0 — no errors (warnings allowed unless --fail-on-warning)
 *   1 — at least one error, or --fail-on-warning and >=1 warning
 *   2 — could not load or parse the Expo config
 *
 * Doctor reads app configuration and installed native artifacts. It never
 * launches an Android toolchain or downloads dependencies, so it also works
 * before prebuild and in a GitHub Actions PR check.
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Imported from the compiled plugin artifacts so the CLI has a single
// source root. Requires `yarn build:plugin` before `yarn build:cli` —
// turbo.json declares the dependency so CI builds in the right order.
const types_1 = require("../../plugin/build/types");
const withPicoDiagnostics_1 = require("../../plugin/build/withPicoDiagnostics");
const ppsArtifacts_1 = require("../../plugin/build/ppsArtifacts");
const utils_1 = require("../../plugin/build/utils");
const withPicoNativeArtifacts_1 = require("../../plugin/build/withPicoNativeArtifacts");
const node_module_1 = require("node:module");
const node_path_1 = require("node:path");
function parseArgs(argv) {
    var _a;
    const args = {
        projectRoot: process.cwd(),
        json: false,
        failOnWarning: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--project' || a === '-p') {
            args.projectRoot = (_a = argv[++i]) !== null && _a !== void 0 ? _a : args.projectRoot;
        }
        else if (a === '--json') {
            args.json = true;
        }
        else if (a === '--fail-on-warning') {
            args.failOnWarning = true;
        }
        else if (a === '--help' || a === '-h') {
            printHelp();
            process.exit(0);
        }
        else {
            process.stderr.write(`expo-pico-doctor: unknown arg '${a}'\n`);
            printHelp();
            process.exit(2);
        }
    }
    return args;
}
function printHelp() {
    process.stdout.write([
        'Usage: expo-pico-doctor [options]',
        '',
        'Options:',
        '  --project <path>     Project root (default: cwd)',
        '  --json               Machine-readable JSON output',
        '  --fail-on-warning    Exit 1 on warning as well as error',
        '  --help               Show this help',
        '',
        'Description:',
        "  Lints an Expo project's app.config against the expo-pico-core",
        '  plugin options without running `npx expo prebuild`. Runs the',
        "  same checks as the plugin's prebuild diagnostics pass plus",
        '  raw-config shape checks that `resolveOptions` would normalize',
        '  away.',
        '',
    ].join('\n'));
}
/**
 * Read plugin entries from `app.config`. Uses Expo's config loader when
 * available (normal Expo project), falls back to reading JSON config
 * files when not. Returns `null` when no
 * config can be located.
 */
function loadPluginOptions(expoConfig) {
    var _a, _b;
    const raw = expoConfig;
    if (!raw)
        return null;
    const plugins = Array.isArray(raw.plugins)
        ? raw.plugins
        : Array.isArray((_a = raw.expo) === null || _a === void 0 ? void 0 : _a.plugins)
            ? raw.expo.plugins
            : [];
    for (const entry of plugins) {
        if (typeof entry === 'string' && entry === '@expo-pico/core') {
            return {};
        }
        if (Array.isArray(entry) && entry[0] === '@expo-pico/core') {
            return ((_b = entry[1]) !== null && _b !== void 0 ? _b : {});
        }
    }
    return null;
}
/**
 * Best-effort Expo config load. Tries `expo/config` first (the
 * canonical Expo loader — handles app.config.ts transpilation, merges
 * app.json + app.config.js, etc.). Falls back to reading app.json /
 * app.config.json directly when Expo is not installed (e.g.
 * running doctor against a bare-RN project).
 */
function loadRawExpoConfig(projectRoot) {
    var _a;
    const requireFromProject = (0, node_module_1.createRequire)((0, node_path_1.resolve)(projectRoot, 'package.json'));
    let expoConfigPath;
    try {
        // Resolve through the app's Expo dependency. @expo/config is an internal
        // Expo dependency and is not hoisted beside this CLI by isolated installs.
        expoConfigPath = requireFromProject.resolve('expo/config');
    }
    catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND')
            throw error;
        // Bare projects without Expo can still use static JSON configuration.
    }
    if (expoConfigPath) {
        const expoConfig = requireFromProject(expoConfigPath);
        // Expo's skipPlugins option deletes the plugins array, which would hide
        // the very entry doctor is inspecting. Normal config evaluation registers
        // native mods but does not execute them or generate an Android project.
        const { exp } = expoConfig.getConfig(projectRoot);
        return exp;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    for (const file of ['app.config.json', 'app.json']) {
        const p = path.join(projectRoot, file);
        if (fs.existsSync(p)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
                return ((_a = parsed.expo) !== null && _a !== void 0 ? _a : parsed);
            }
            catch {
                // Invalid JSON — report later.
            }
        }
    }
    return null;
}
// ── ANSI colors (stdlib-only — no chalk dependency) ──────────────────
const COLORS = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    green: '\x1b[32m',
    gray: '\x1b[90m',
};
function useColor() {
    if (process.env.NO_COLOR)
        return false;
    if (process.env.FORCE_COLOR)
        return true;
    return Boolean(process.stdout.isTTY);
}
function colorize(text, color) {
    return useColor() ? `${COLORS[color]}${text}${COLORS.reset}` : text;
}
function renderFinding(f) {
    const tag = f.severity === 'error'
        ? colorize('ERROR  ', 'red')
        : f.severity === 'warning'
            ? colorize('WARN   ', 'yellow')
            : colorize('info   ', 'blue');
    const id = colorize(f.id, 'dim');
    return `${tag} ${id}\n        ${f.message}`;
}
/**
 * Locked orientation defeats the panel-size contract.
 *
 * Expo turns `orientation: 'landscape' | 'portrait'` into
 * `android:screenOrientation` on MainActivity. On PICO that pins the activity
 * and the `<layout android:defaultWidth/defaultHeight>` this plugin writes is
 * ignored — the panel silently comes up at the system default size. Same rule
 * expo-horizon-core follows: leave it `default` and let the container decide.
 *
 * Config-level, so it cannot live in runDiagnosticChecks — that reducer only
 * sees resolved plugin options.
 */
function checkOrientation(expoConfig, resolved) {
    if (!expoConfig)
        return [];
    const orientation = expoConfig.orientation;
    if (typeof orientation !== 'string' || orientation === 'default')
        return [];
    const panelSized = Boolean(resolved.defaultWidth || resolved.defaultHeight);
    const picoFlavor = resolved.buildVariant === 'pico' || resolved.buildVariant === 'dual';
    if (!picoFlavor)
        return [];
    return [
        {
            id: 'orientation-locked',
            // An error only when it is provably breaking something the user asked
            // for; otherwise a warning, since a 2D-only app may want the lock.
            severity: panelSized ? 'error' : 'warning',
            message: `app.config orientation is "${orientation}" — set it to "default" so the ` +
                'PICO window container controls the panel dimensions. A locked ' +
                'orientation writes android:screenOrientation onto MainActivity, which ' +
                (panelSized
                    ? 'overrides the defaultWidth/defaultHeight you configured.'
                    : 'will override defaultWidth/defaultHeight if you set them.'),
        },
    ];
}
/**
 * Duplicate PICO Platform Service artifacts on the Android classpath.
 *
 * `expo-pico-core` declares the `com.pico.pps:*` coordinates once, in the
 * app module, and every sibling `@expo-pico/*` package reaches them
 * transitively — so adding more packages cannot double a declaration. Two
 * things outside the plugin's control still can:
 *
 *  1. A copy of a PPS artifact dropped into `android/app/libs/`. PICO's own
 *     integration docs tell you to put SDK AARs there. The generated
 *     `fileTree` excludes them by name, so the file is inert — but a
 *     developer who put it there is entitled to know it is doing nothing,
 *     and an older plugin version's unbounded `fileTree` would have
 *     packaged it and failed the build on `checkDuplicateClasses`.
 *  2. A hand-written `com.pico.pps` line in `app/build.gradle` outside the
 *     plugin's marker block. The resolution pin keeps the version
 *     consistent, so this is not fatal, but it is a second place to update
 *     on the next SDK bump.
 *
 * Filesystem-level, so it cannot live in `runDiagnosticChecks` — that
 * reducer only sees resolved plugin options.
 */
function checkDuplicatePicoArtifacts(projectRoot, resolved) {
    var _a;
    if (resolved.xrMode === 'mobile')
        return [];
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const findings = [];
    const globToRegExp = (glob) => new RegExp(`^${glob.replace(/[.]/g, '\\.').replace(/\*/g, '.*')}$`);
    const excludePatterns = ppsArtifacts_1.PPS_LOCAL_AAR_EXCLUDES.map(globToRegExp);
    const libsDir = path.join(projectRoot, 'android', 'app', 'libs');
    let shadowed = [];
    try {
        shadowed = fs
            .readdirSync(libsDir)
            .filter((name) => excludePatterns.some((re) => re.test(name)));
    }
    catch {
        // No android/ yet (managed workflow, pre-prebuild) — nothing to check.
    }
    if (shadowed.length > 0) {
        findings.push({
            id: 'pps-artifact-shadowed-by-libs',
            severity: 'warning',
            message: `android/app/libs contains ${shadowed.length} file(s) that ${ppsArtifacts_1.PPS_GROUP} ` +
                `already supplies from Maven: ${shadowed.join(', ')}. They are excluded ` +
                'from the generated fileTree so the build still succeeds, but nothing ' +
                'loads them. Delete them: the plugin already declares the Maven copy, and ' +
                'platformService.services selects which services land, not their version.',
        });
    }
    const appGradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
    let appGradle = '';
    try {
        appGradle = fs.readFileSync(appGradlePath, 'utf8');
    }
    catch {
        return findings;
    }
    const DEPS_MARKER = '// expo-pico-core: PICO Platform Service SDK (com.pico.pps:*) deps';
    const markerCount = appGradle.split(DEPS_MARKER).length - 1;
    if (markerCount > 1) {
        findings.push({
            id: 'pps-block-injected-twice',
            severity: 'error',
            message: `app/build.gradle contains the expo-pico-core PPS dependency block ` +
                `${markerCount} times. Every artifact is declared twice. Delete the ` +
                'duplicate block, or run `npx expo prebuild --clean` to regenerate.',
        });
    }
    // Any pinned PPS coordinate requested at a version other than the one
    // the plugin pins. The resolution pin makes these resolve consistently
    // rather than skewing `pps_sdk_base` away from the services, so this is
    // a warning — but it is a second place to update on the next SDK bump,
    // and it means someone believed they were choosing a version.
    const coordinate = new RegExp(`${ppsArtifacts_1.PPS_GROUP.replace(/\./g, '\\.')}:(platform-service-[a-z]+|pps_sdk_base):([^"'\\s]+)`, 'g');
    // A skewed line inside the plugin's own PPS block was written by an older
    // plugin version; the next prebuild rewrites that block in place.
    let block;
    try {
        block = markerCount === 1 ? (0, utils_1.markedBlockRange)(appGradle, DEPS_MARKER) : undefined;
    }
    catch {
        block = undefined;
    }
    const generated = new Set();
    const handWritten = new Set();
    for (const match of appGradle.matchAll(coordinate)) {
        const [, name, version] = match;
        const pinned = (0, ppsArtifacts_1.ppsPinnedVersion)(name);
        if (pinned === undefined || version === pinned)
            continue;
        const at = (_a = match.index) !== null && _a !== void 0 ? _a : 0;
        const inBlock = block !== undefined && at >= block.start && at < block.end;
        (inBlock ? generated : handWritten).add(`${ppsArtifacts_1.PPS_GROUP}:${name}:${version}`);
    }
    if (generated.size > 0 || handWritten.size > 0) {
        const parts = [];
        if (handWritten.size > 0) {
            parts.push(`app/build.gradle requests ${handWritten.size} ${ppsArtifacts_1.PPS_GROUP} coordinate(s) at a ` +
                `version expo-pico-core does not pin: ${[...handWritten].sort().join(', ')}. ` +
                'The resolution pin overrides them so the services and their shared ' +
                'pps_sdk_base stay in step, which means the version written here has no ' +
                'effect. Remove it.');
        }
        if (generated.size > 0) {
            parts.push(`The expo-pico-core PPS block in app/build.gradle still carries an older ` +
                `plugin version's pins: ${[...generated].sort().join(', ')}. Run ` +
                '`npx expo prebuild` and the plugin rewrites the block with its current ' +
                'pins, along with the resolution pin in android/build.gradle.');
        }
        findings.push({
            id: 'pps-coordinate-version-skew',
            severity: 'warning',
            message: parts.join(' '),
        });
    }
    return findings;
}
function main() {
    const args = parseArgs(process.argv.slice(2));
    let expoConfig;
    try {
        expoConfig = loadRawExpoConfig(args.projectRoot);
    }
    catch (error) {
        const result = {
            error: 'Could not load Expo configuration',
            projectRoot: args.projectRoot,
            detail: error instanceof Error ? error.message : String(error),
        };
        if (args.json)
            process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        else
            process.stderr.write(`expo-pico-doctor: ${result.error}: ${result.detail}\n`);
        process.exit(2);
    }
    const raw = loadPluginOptions(expoConfig);
    if (raw === null) {
        const err = {
            error: 'expo-pico-core plugin not found in app.config plugins array',
            projectRoot: args.projectRoot,
            hint: 'Doctor looks for an entry "@expo-pico/core" (or ["@expo-pico/core", {...}]) ' +
                'inside the top-level `plugins` array of app.config.ts / app.config.js / ' +
                'app.config.json / app.json. Add the plugin there and re-run.',
        };
        if (args.json) {
            process.stdout.write(JSON.stringify(err, null, 2) + '\n');
        }
        else {
            process.stderr.write(colorize('expo-pico-doctor: ', 'red') +
                err.error +
                '\n' +
                colorize(`(project root: ${err.projectRoot})\n`, 'gray') +
                colorize(err.hint, 'gray') +
                '\n');
        }
        process.exit(2);
    }
    const resolved = (0, types_1.resolveOptions)(raw);
    const hasDevClient = (() => {
        var _a, _b;
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const fsLocal = require('fs');
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const pathLocal = require('path');
            const pkg = JSON.parse(fsLocal.readFileSync(pathLocal.join(args.projectRoot, 'package.json'), 'utf8'));
            return Boolean(((_a = pkg.dependencies) === null || _a === void 0 ? void 0 : _a['expo-dev-client']) || ((_b = pkg.devDependencies) === null || _b === void 0 ? void 0 : _b['expo-dev-client']));
        }
        catch {
            return false;
        }
    })();
    const findings = [
        ...(0, withPicoDiagnostics_1.runDiagnosticChecks)(resolved, { hasDevClient }),
        ...checkOrientation(expoConfig, resolved),
        ...checkDuplicatePicoArtifacts(args.projectRoot, resolved),
        ...((0, withPicoNativeArtifacts_1.usesPicoArtifacts)(resolved) ? (0, withPicoNativeArtifacts_1.checkPicoNativeArtifacts)(args.projectRoot) : []),
    ];
    const errorCount = findings.filter((f) => f.severity === 'error').length;
    const warnCount = findings.filter((f) => f.severity === 'warning').length;
    const infoCount = findings.filter((f) => f.severity === 'info').length;
    if (args.json) {
        process.stdout.write(JSON.stringify({
            projectRoot: args.projectRoot,
            resolvedOptions: resolved,
            findings,
            summary: { errorCount, warnCount, infoCount },
        }, null, 2) + '\n');
    }
    else {
        process.stdout.write(colorize('expo-pico-doctor\n', 'bold') +
            colorize(`  project: ${args.projectRoot}\n`, 'gray') +
            colorize(`  xrMode: ${resolved.xrMode}   appType: ${resolved.appType}   buildVariant: ${resolved.buildVariant}\n`, 'gray') +
            '\n');
        if (findings.length === 0) {
            process.stdout.write(colorize('✓ No issues.\n', 'green'));
        }
        else {
            for (const f of findings) {
                process.stdout.write(renderFinding(f) + '\n\n');
            }
            const summary = `${errorCount} error${errorCount === 1 ? '' : 's'}, ` +
                `${warnCount} warning${warnCount === 1 ? '' : 's'}, ` +
                `${infoCount} info`;
            process.stdout.write(errorCount > 0
                ? colorize(summary + '\n', 'red')
                : warnCount > 0
                    ? colorize(summary + '\n', 'yellow')
                    : colorize(summary + '\n', 'blue'));
        }
    }
    if (errorCount > 0)
        process.exit(1);
    if (args.failOnWarning && warnCount > 0)
        process.exit(1);
    process.exit(0);
}
main();
