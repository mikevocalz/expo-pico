import { isHeadsetDevice, navigationPlacement, RAIL_MIN_WIDTH_DP } from '../navigation';

describe('navigationPlacement', () => {
  it('puts the rail in its own window on a headset when the window is placed', () => {
    expect(navigationPlacement({ spatial: true, railWindow: 'spatial', widthDp: 1280 })).toBe(
      'rail-window'
    );
  });

  it.each(['pending', 'dropped', 'inline'] as const)(
    'draws the rail on the left inside the main panel on a headset when the window is %s',
    (railWindow) => {
      expect(navigationPlacement({ spatial: true, railWindow, widthDp: 1280 })).toBe('rail-inline');
    }
  );

  it('never gives a headset the bottom tab bar, at any width', () => {
    for (const widthDp of [0, 320, 599, 600, 1600]) {
      for (const railWindow of ['spatial', 'pending', 'dropped', 'inline'] as const) {
        expect(navigationPlacement({ spatial: true, railWindow, widthDp })).not.toBe('bottom-tabs');
      }
    }
  });

  it('gives phones the bottom tab bar', () => {
    expect(navigationPlacement({ spatial: false, railWindow: 'inline', widthDp: 411 })).toBe(
      'bottom-tabs'
    );
  });

  it('gives tablets and unfolded foldables the left rail', () => {
    for (const widthDp of [RAIL_MIN_WIDTH_DP, 673, 800, 1280]) {
      expect(navigationPlacement({ spatial: false, railWindow: 'inline', widthDp })).toBe(
        'rail-inline'
      );
    }
  });
});

describe('isHeadsetDevice', () => {
  it('recognises the headsets this repo is tested on (getprop values)', () => {
    expect(
      isHeadsetDevice('android', { Manufacturer: 'Oculus', Brand: 'oculus', Model: 'Quest 3S' })
    ).toBe(true);
    expect(
      isHeadsetDevice('android', { Manufacturer: 'Pico', Brand: 'Pico', Model: 'A9210' })
    ).toBe(true);
    expect(isHeadsetDevice('android', { Manufacturer: 'Meta', Brand: 'meta', Model: 'x' })).toBe(
      true
    );
  });

  it('is false on phones, iOS and missing constants', () => {
    expect(
      isHeadsetDevice('android', { Manufacturer: 'Google', Brand: 'google', Model: 'Pixel 9' })
    ).toBe(false);
    expect(isHeadsetDevice('ios', { Manufacturer: 'Oculus' })).toBe(false);
    expect(isHeadsetDevice('android', undefined)).toBe(false);
  });
});
