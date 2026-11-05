import { useShellStore } from '../detailPanel.store';

// After a detail panel launch fails, the detail opens as a pushed screen and
// the status stays 'failed'. Leaving that screen with hardware BACK skipped
// the Close button's clear(), so the selection and the failed status stayed,
// and every later detail opened as a pushed screen instead of the panel.

beforeEach(() => {
  useShellStore.setState({ selectedId: null, status: 'closed' });
});

describe('leaving the pushed detail screen', () => {
  it('clears the selection and lets the next detail try the panel again', () => {
    const store = useShellStore.getState();
    store.select('layout');
    store.setStatus('failed');

    useShellStore.getState().leaveDetailScreen('layout');

    expect(useShellStore.getState().selectedId).toBeNull();
    expect(useShellStore.getState().status).toBe('closed');
  });

  it('keeps a newer selection made while the screen was open', () => {
    const store = useShellStore.getState();
    store.select('headset');
    store.setStatus('failed');

    useShellStore.getState().leaveDetailScreen('layout');

    expect(useShellStore.getState().selectedId).toBe('headset');
    expect(useShellStore.getState().status).toBe('failed');
  });

  it('leaves an open panel alone', () => {
    const store = useShellStore.getState();
    store.select('layout');
    store.setStatus('open');

    useShellStore.getState().leaveDetailScreen('headset');

    expect(useShellStore.getState().status).toBe('open');
  });
});
