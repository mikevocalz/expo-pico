import { Android, type HybridObject } from 'react-native-nitro-modules';

import type { ListenerSubscription } from './ListenerSubscription';
import type { PanelClosedEvent } from './PanelClosedEvent';
import type { PanelOpenedEvent } from './PanelOpenedEvent';
import type { PanelSizeDp } from './PanelSizeDp';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- resolves the {@linkcode} target below
import type { PicoWindows } from './PicoWindows.nitro';

/**
 * Opens React Native components as separate PICO panels. Each panel is its
 * own activity in its own task and a second surface on the app's one React
 * Native runtime, so module state is shared with the main window.
 *
 * Created by {@linkcode PicoWindows.createPanelHost}, which rejects on
 * builds that cannot open panels. PICO OS picks where a panel opens, and the
 * user can move it.
 */
@Android({ language: 'kotlin', implementation: { className: 'HybridPicoPanelHost' } })
export declare class PicoPanelHost extends HybridObject {
  /**
   * Opens `name`, a component registered with `AppRegistry.registerComponent`,
   * in a panel of its own. Resolves once the launch is handed to the OS;
   * {@linkcode PicoPanelHost.addOnPanelOpenedListener} reports when it is on
   * screen. Opening a name that is already open does nothing.
   *
   * @param size The panel's size. On PICO OS 5 the launch is the only place
   *   a third-party window's size is read.
   * @param props Initial props, delivered to the component as strings.
   * @throws When the size is not positive, is square, or the app has no
   *   current activity to launch from.
   */
  openPanel(name: string, size: PanelSizeDp, props?: Record<string, string>): Promise<void>;

  /**
   * Closes the panel showing `name`. Resolves without effect when none is
   * open. The close event reports `reason: 'app'`.
   */
  closePanel(name: string): Promise<void>;

  /** Calls `listener` each time a panel finishes opening. */
  addOnPanelOpenedListener(listener: (event: PanelOpenedEvent) => void): ListenerSubscription;

  /** Calls `listener` each time a panel closes. */
  addOnPanelClosedListener(listener: (event: PanelClosedEvent) => void): ListenerSubscription;
}

export * from '#nitro/PicoPanelHost';
