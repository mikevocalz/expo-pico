import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Minimal tab container. Renders a scrollable row of tab labels above
 * the body; only the active tab's content is mounted so the ValidationHarness
 * (which runs a lot of module-side work on mount) doesn't pay the cost
 * when the user is looking at the 3D scene.
 *
 * Intentionally stateless dependency-wise — no navigation library, no
 * external tab package. The example ships with a fixed three-tab layout
 * (Scene / Diagnostics / Harness) and this component keeps the layout
 * code under 100 lines.
 */

export interface TabDefinition {
  /** Stable tab id; used as the React key. */
  id: string;
  /** Short tab label, shown in the tab bar. */
  label: string;
  /** Optional accessory rendered inline in the tab button (e.g. a badge). */
  badge?: string | null;
  /** Lazy element factory. Called only when the tab is active. */
  render: () => React.ReactElement;
}

interface TabsProps {
  tabs: readonly TabDefinition[];
  /** Initial active tab id. Defaults to the first tab. */
  initialId?: string;
}

export function Tabs({ tabs, initialId }: TabsProps): JSX.Element {
  const [activeId, setActiveId] = useState<string>(initialId ?? tabs[0]?.id ?? '');
  const active = useMemo(() => tabs.find((t) => t.id === activeId) ?? tabs[0], [tabs, activeId]);

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {tabs.map((t) => {
          const isActive = t.id === activeId;
          return (
            <Pressable
              key={t.id}
              onPress={() => setActiveId(t.id)}
              style={[styles.tab, isActive && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={t.label}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {t.label}
              </Text>
              {t.badge ? (
                <Text style={[styles.badge, isActive && styles.badgeActive]}>
                  {t.badge}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.body}>{active?.render()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0d1a',
  },
  bar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1c30',
    backgroundColor: '#0f1126',
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6d7cff',
  },
  tabLabel: {
    color: '#8a91c0',
    fontSize: 13,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  badge: {
    backgroundColor: '#2a2d45',
    color: '#8a91c0',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '700',
    overflow: 'hidden',
  },
  badgeActive: {
    backgroundColor: '#6d7cff',
    color: '#ffffff',
  },
  body: {
    flex: 1,
  },
});

export default Tabs;
