import * as fs from 'fs';
import * as path from 'path';

// requestImmersivePermission settles only through ReactActivity's permission
// listener. If the immersive activity is destroyed while the grant dialog is
// up, that listener never runs, and ensureEyeTrackingPermission() would keep
// returning the same unsettled promise for the rest of the process. The
// request has to settle as no_immersive_activity when the activity goes away,
// which also lets the next immersive mount ask again.

const NITRO = path.join(__dirname, '..', 'android', 'src', 'nitro');
const read = (name: string) => fs.readFileSync(path.join(NITRO, name), 'utf8');

describe('immersive permission request', () => {
  const request = read('Activity+requestPermissionStatus.kt');

  it('watches the activity for destruction while the dialog is up', () => {
    expect(request).toMatch(/doOnDestroy\s*\{/);
  });

  it('settles as no_immersive_activity when the activity is destroyed', () => {
    const onDestroy = request.slice(request.indexOf('doOnDestroy {'));
    expect(onDestroy.slice(0, onDestroy.indexOf('}'))).toContain(
      'PicoPermissionStatus.NO_IMMERSIVE_ACTIVITY'
    );
  });

  it('settles once: the listener and the destroy watcher share one guard', () => {
    expect(request).toMatch(/var settled = false/);
    expect(request.match(/if \(settled\) return/g) ?? []).toHaveLength(1);
    expect(request).toMatch(/stopWatching\(\)/);
  });

  it('answers a request made from an already destroyed activity', () => {
    expect(request).toMatch(/if \(isDestroyed\)/);
  });

  it('removes the lifecycle callback after it fires', () => {
    const watcher = read('Activity+doOnDestroy.kt');
    expect(watcher).toContain('registerActivityLifecycleCallbacks');
    expect(watcher).toContain('unregisterActivityLifecycleCallbacks');
    expect(watcher).toMatch(/activity !== this@doOnDestroy\) return/);
  });
});
