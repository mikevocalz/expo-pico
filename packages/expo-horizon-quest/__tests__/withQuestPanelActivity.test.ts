import { AndroidConfig } from '@expo/config-plugins';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { resolveQuestOptions } from '../plugin/src/types';
import {
  applyQuestPanelActivity,
  normalizeDetailPanel,
  PANEL_ACTIVITY,
  syncQuestPanelActivity,
} from '../plugin/src/withQuestPanelActivity';

type Manifest = AndroidConfig.Manifest.AndroidManifest;

const SIZE = { defaultWidth: '420dp', defaultHeight: '600dp' };

const questManifest = (): Manifest =>
  ({
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      application: [
        { $: {}, 'meta-data': [{ $: { 'android:name': 'keep', 'android:value': '1' } }] },
      ],
    },
  }) as unknown as Manifest;

const panelOf = (m: Manifest): any =>
  ((m.manifest.application?.[0] as any).activity ?? []).find(
    (a: any) => a.$['android:name'] === PANEL_ACTIVITY
  );

describe('detailPanel option', () => {
  it('is off unless set', () => {
    expect(resolveQuestOptions().detailPanel).toBeNull();
    expect(resolveQuestOptions({ detailPanel: false }).detailPanel).toBeNull();
    expect(resolveQuestOptions({ detailPanel: SIZE }).detailPanel).toEqual(SIZE);
  });

  it.each([
    [{ defaultWidth: '420', defaultHeight: '600dp' }, /must look like "420dp"/],
    [{ defaultWidth: '300dp', defaultHeight: '600dp' }, /outside Meta's 384-1440dp/],
  ])('rejects %p', (value, message) => {
    expect(() => normalizeDetailPanel(value)).toThrow(message);
  });
});

describe('applyQuestPanelActivity', () => {
  it('declares the core panel activity with its <layout> size and no launcher filter', () => {
    const m = questManifest();
    expect(applyQuestPanelActivity(m, SIZE)).toBe(true);
    const panel = panelOf(m);
    expect(panel.$['android:exported']).toBe('false');
    expect(panel.$['android:taskAffinity']).toBe('${applicationId}.panel');
    expect(panel.layout).toEqual([
      { $: { 'android:defaultWidth': '420dp', 'android:defaultHeight': '600dp' } },
    ]);
    expect(panel['intent-filter']).toBeUndefined();
    expect((m.manifest.application?.[0] as any)['meta-data']).toHaveLength(1);
  });

  it('is idempotent and removes the activity when switched off', () => {
    const m = questManifest();
    applyQuestPanelActivity(m, SIZE);
    expect(applyQuestPanelActivity(m, SIZE)).toBe(false);
    expect(applyQuestPanelActivity(m, null)).toBe(true);
    expect(panelOf(m)).toBeUndefined();
  });

  it('never creates a quest manifest that expo-horizon-core did not write', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'quest-panel-'));
    try {
      await syncQuestPanelActivity(root, resolveQuestOptions({ detailPanel: SIZE }));
      expect(fs.existsSync(path.join(root, 'app/src/quest/AndroidManifest.xml'))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
