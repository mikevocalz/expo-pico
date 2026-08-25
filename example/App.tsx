import React, { useCallback, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Freeze } from 'react-freeze';

import { DiagnosticsPanel } from './src/scene/DiagnosticsPanel';
import { XrScreen } from './src/scene/XrScreen';
import { HomeScreen, type HomeRoute } from './src/ui/HomeScreen';
import { palette, radius, space } from './src/ui/theme';
import { useLayout } from './src/ui/useLayout';
import { ValidationHarness } from './src/validation/ValidationHarness';

type Route = 'home' | HomeRoute;

/**
 * Screen host. Every route stays mounted and absolutely positioned; the
 * inactive ones are display:none'd and wrapped in <Freeze> so their trees
 * stop re-rendering.
 *
 * This matters most for the XR route. Unmounting the Viro navigator while its
 * native session is live is the reliable way to crash the app, so the route is
 * suspended rather than torn down — returning to it is instant and the cube is
 * still where the user left it.
 */
function Screen({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View
      style={[StyleSheet.absoluteFill, !active && styles.hidden]}
      pointerEvents={active ? 'auto' : 'none'}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      <Freeze freeze={!active}>{children}</Freeze>
    </View>
  );
}

/** Back chrome for the two surfaces that have no back affordance of their own. */
function Sheet({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const L = useLayout();
  return (
    <View style={styles.sheet}>
      <View style={[styles.sheetBar, { paddingHorizontal: L.gutter / 2 }]}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Back from ${title}`}
          hitSlop={12}
        >
          <Text style={styles.backGlyph}>‹</Text>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <Text style={styles.sheetTitle}>{title}</Text>
        <View style={styles.backSpacer} />
      </View>
      <View style={styles.sheetBody}>{children}</View>
    </View>
  );
}

export default function App(): React.JSX.Element {
  const [route, setRoute] = useState<Route>('home');
  // The XR route mounts on first visit and then stays mounted for Freeze to
  // suspend. The others are cheap enough to mount on demand.
  const [xrMounted, setXrMounted] = useState(false);

  const goHome = useCallback(() => setRoute('home'), []);
  const navigate = useCallback((next: HomeRoute) => {
    if (next === 'xr') setXrMounted(true);
    setRoute(next);
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <Screen active={route === 'home'}>
        <HomeScreen onNavigate={navigate} />
      </Screen>

      {xrMounted && (
        <Screen active={route === 'xr'}>
          <XrScreen onBack={goHome} />
        </Screen>
      )}

      {route === 'diagnostics' && (
        <Screen active>
          <Sheet title="Diagnostics" onBack={goHome}>
            <DiagnosticsPanel />
          </Sheet>
        </Screen>
      )}

      {route === 'harness' && (
        <Screen active>
          <Sheet title="Validation harness" onBack={goHome}>
            <ValidationHarness />
          </Sheet>
        </Screen>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  hidden: { display: 'none' },

  sheet: { flex: 1, backgroundColor: palette.bg },
  sheetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  sheetTitle: { color: palette.text, fontSize: 15, fontWeight: '700' },
  sheetBody: { flex: 1 },
  backSpacer: { width: 84 },

  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: palette.bgRaised,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.sm + 4,
    width: 84,
  },
  backPressed: { backgroundColor: palette.bgCard },
  backGlyph: { color: palette.text, fontSize: 18, marginTop: -2 },
  backLabel: { color: palette.text, fontSize: 13, fontWeight: '600' },
});
