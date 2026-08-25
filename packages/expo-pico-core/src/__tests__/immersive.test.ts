import { AppRegistry } from 'react-native';

import {
  IMMERSIVE_ROOT_COMPONENT,
  hasImmersiveSceneRegistered,
  registerImmersiveScene,
} from '../immersive';

type Stub = typeof AppRegistry & { __reset: () => void };

describe('immersive scene registration', () => {
  beforeEach(() => (AppRegistry as Stub).__reset());

  it('registers under the name the immersive activity mounts', () => {
    // VRActivity.getMainComponentName() returns this literal. If it ever
    // changes, the activity mounts nothing and hangs on a blank screen with no
    // error, so the constant is worth pinning.
    expect(IMMERSIVE_ROOT_COMPONENT).toBe('VRQuestScene');

    const Scene = () => null;
    registerImmersiveScene(Scene);

    expect(AppRegistry.getAppKeys()).toContain('VRQuestScene');
  });

  it('reports whether a scene is registered', () => {
    expect(hasImmersiveSceneRegistered()).toBe(false);
    registerImmersiveScene(() => null);
    expect(hasImmersiveSceneRegistered()).toBe(true);
  });

  it('last registration wins, so an app can override the renderer default', () => {
    const First = () => null;
    const Second = () => null;
    registerImmersiveScene(First);
    registerImmersiveScene(Second);

    const provider = (
      AppRegistry as unknown as {
        __getRegistrations: () => Map<string, () => unknown>;
      }
    ).__getRegistrations();
    expect(provider.get('VRQuestScene')?.()).toBe(Second);
  });
});
