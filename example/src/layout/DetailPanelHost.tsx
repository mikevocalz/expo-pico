import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { PicoWindows } from '@expo-pico/core';
import { detailPanelCommand, detailPanelStatusAfter } from '@expo-pico/spatial';

import { DETAIL_PANEL_COMPONENT, SHELL, type DetailId } from './shell';
import { useShellStore } from './detailPanel.store';

/** True when this APK declares the panel activity (pico flavor, or quest with `detailPanel`). */
function panelsDeclared(): boolean {
  try {
    return new PicoWindows().isPanelAvailable;
  } catch {
    // PicoWindows is Android only; iOS and web have no panels.
    return false;
  }
}

const PANELS_DECLARED = panelsDeclared();

/**
 * Shows the selected detail as its own panel beside the main panel, the way
 * Harlem Might's Place Detail does (its ADR 0006): a second activity on the
 * app's one ReactHost, launched with Meta's multi-panel flags, which Horizon OS
 * places in the slot beside the app's panel and PICO OS 5 opens as its own
 * window.
 *
 * - Selecting content opens the panel; selecting other content updates it in
 *   place (the panel reads the same store).
 * - Clearing the selection closes it.
 * - Closing the panel itself (its Close button, Back, the OS) clears the
 *   selection, which returns the user to rail and main.
 * - When the launch fails, the detail opens as a pushed screen instead.
 *
 * Mount once, in the root layout. Renders nothing.
 */
export function DetailPanelHost(): null {
  const router = useRouter();
  const selectedId = useShellStore((state) => state.selectedId);
  const status = useShellStore((state) => state.status);
  const panelHost = useShellStore((state) => state.panelHost);

  useEffect(() => {
    if (!PANELS_DECLARED) return;
    let active = true;
    new PicoWindows()
      .createPanelHost()
      .then((host) => {
        if (active) useShellStore.getState().setPanelHost(host);
      })
      .catch((error: unknown) => {
        console.warn(`[detail panel] no panel host; detail opens as a screen. ${String(error)}`);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!panelHost) return;
    const opened = panelHost.addOnPanelOpenedListener(({ name }) => {
      if (name !== DETAIL_PANEL_COMPONENT) return;
      useShellStore.getState().setStatus(detailPanelStatusAfter({ type: 'opened' }));
    });
    const closed = panelHost.addOnPanelClosedListener(({ name, reason }) => {
      if (name !== DETAIL_PANEL_COMPONENT) return;
      const store = useShellStore.getState();
      store.setStatus(detailPanelStatusAfter({ type: 'closed' }));
      if (reason === 'user') store.clear();
    });
    return () => {
      opened.remove();
      closed.remove();
    };
  }, [panelHost]);

  useEffect(() => {
    const store = useShellStore.getState();
    if (status === 'failed' && selectedId == null) {
      store.setStatus('closed');
      return;
    }
    const command = detailPanelCommand({ selectedId, status, isAvailable: panelHost != null });
    if (command === 'open' && panelHost) {
      store.setStatus(detailPanelStatusAfter({ type: 'requested' }));
      panelHost
        .openPanel(DETAIL_PANEL_COMPONENT, SHELL.detailPanelSizeDp)
        .catch((error: unknown) => {
          console.warn(`[detail panel] did not open; showing it as a screen. ${String(error)}`);
          const current = useShellStore.getState();
          current.setStatus(detailPanelStatusAfter({ type: 'failed' }));
          if (current.selectedId) router.push(`/detail/${current.selectedId}`);
        });
    } else if (command === 'close' && panelHost) {
      panelHost.closePanel(DETAIL_PANEL_COMPONENT).catch((error: unknown) => {
        console.warn(`[detail panel] did not close. ${String(error)}`);
      });
    }
  }, [selectedId, status, panelHost, router]);

  return null;
}

/**
 * Opens detail content: in the detail panel where this build has one, as a
 * pushed screen otherwise (phones, headsets whose panel host is not ready,
 * and after a panel launch failed).
 */
export function useOpenDetail(): (id: DetailId) => void {
  const router = useRouter();
  const inPanel = useShellStore((state) => state.panelHost != null && state.status !== 'failed');
  const select = useShellStore((state) => state.select);
  return (id) => {
    select(id);
    if (!inPanel) router.push(`/detail/${id}`);
  };
}
