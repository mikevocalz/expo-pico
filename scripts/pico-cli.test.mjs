import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { main, plan, validateResult } from './pico-cli.mjs';

test('device commands require explicit serials', () => {
  for (const command of ['install', 'launch', 'capture'])
    assert.throws(() => plan([command]), /--device/);
});
test('install preserves literal paths as one argument', () => {
  const { jobs } = plan([
    'install',
    '--device',
    'test-serial',
    '--apk',
    '/tmp/a $(no shell).apk',
    '--dry-run',
  ]);
  assert.deepEqual(jobs[0].args, [
    'app',
    'install',
    '/tmp/a $(no shell).apk',
    '--device',
    'test-serial',
    '--replace',
  ]);
});
test('launch targets the panel so Viro can set its scene intent', () => {
  assert.deepEqual(plan(['launch', '--device', 's', '--package', 'com.example.xr']).jobs[0].args, [
    'app',
    'launch',
    'com.example.xr',
    '--device',
    's',
  ]);
});
test('capture is bounded and package-filtered', () => {
  const { jobs } = plan([
    'capture',
    '--device',
    's',
    '--package',
    'com.example.xr',
    '--out',
    'artifacts/capture',
  ]);
  assert.equal(jobs.length, 3);
  assert.deepEqual(jobs[1].args, [
    'app',
    'logcat',
    '--device',
    's',
    '--package',
    'com.example.xr',
    '--lines',
    '1000',
    '--format',
    'json',
  ]);
  assert.ok(jobs.every((job) => job.args.includes('s')));
});
test('doctor failure payload fails even with exit code zero', () => {
  assert.throws(
    () =>
      validateResult(
        { status: 0, stdout: '{"tool_status":"FAILED","summary":"missing adb"}' },
        true
      ),
    /missing adb/
  );
  assert.doesNotThrow(() =>
    validateResult({ status: 0, stdout: '{"tool_status":"SUCCESS"}' }, true)
  );
  assert.throws(() => validateResult({ status: 0, stdout: 'not json' }, true), /non-JSON/);
  assert.throws(() => validateResult({ status: 1 }, false), /exited 1/);
});
test('dry-run never starts a child process', () => {
  main(['doctor', '--dry-run'], () => {
    throw new Error('must not execute');
  });
});
// cac (the PICO CLI's parser) reads `--device -e` as `{device: true, e: true}`:
// a single-dash value is a flag to the downstream CLI, not a serial.
test('device serials cannot smuggle flags into the PICO CLI', () => {
  for (const serial of ['-e', '-s', '-p 5555', '-', '--'])
    for (const command of ['install', 'launch', 'capture'])
      assert.throws(() => plan([command, '--device', serial]), /--device/, `${command} ${serial}`);
  for (const serial of ['emulator-5554', '1WMHHXXXXXXXXX', '192.168.1.5:5555', 'PA7.842.1'])
    assert.equal(
      plan(['launch', '--device', serial, '--package', 'com.example.xr']).jobs[0].args[4],
      serial
    );
});
test('capture refuses an --out that escapes the working directory', () => {
  const escape = (out) =>
    plan(['capture', '--device', 's', '--package', 'com.example.xr', '--out', out]);
  for (const out of ['../../../../../tmp/PWNED', '/tmp/PWNED', path.join(process.cwd(), '..')])
    assert.throws(() => escape(out), /--out/, out);
  assert.equal(
    escape('artifacts/capture').jobs[0].file,
    path.join(process.cwd(), 'artifacts/capture/device.json')
  );
});
test('a failed run leaves no evidence file behind', () => {
  const out = mkdtempSync(path.join(process.cwd(), 'pico-cli-test-'));
  try {
    assert.throws(
      () =>
        main(
          ['capture', '--device', 'test-serial', '--package', 'com.example.xr', '--out', out],
          () => ({
            status: 1,
            stdout: '{"partial":',
            stderr: '',
          })
        ),
      /exited 1/
    );
    assert.equal(existsSync(path.join(out, 'device.json')), false);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
