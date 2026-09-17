import test from 'node:test';
import assert from 'node:assert/strict';
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
    '/tmp/capture',
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
  assert.throws(() => validateResult({ status: 0, stdout: 'not json' }, true));
  assert.throws(() => validateResult({ status: 1 }, false), /exited 1/);
});
test('dry-run never starts a child process', () => {
  main(['doctor', '--dry-run'], () => {
    throw new Error('must not execute');
  });
});
