import React, { useEffect } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { useShellStore } from '../../src/layout/detailPanel.store';
import { isDetailId } from '../../src/layout/shell';
import { DetailSurface } from '../../src/ui/DetailSurface';

/**
 * Detail as a pushed screen: on phones, and on a headset whose detail panel
 * could not open. Leaving the screen any way (Close, hardware BACK, a gesture)
 * clears the selection, so after a failed panel launch the next detail tries
 * the panel again instead of always opening here.
 */
export default function Detail(): React.JSX.Element {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const leaveDetailScreen = useShellStore((state) => state.leaveDetailScreen);
  useEffect(
    () => () => {
      if (isDetailId(id)) leaveDetailScreen(id);
    },
    [id, leaveDetailScreen]
  );
  if (!isDetailId(id)) return <Redirect href="/" />;
  return (
    <DetailSurface
      id={id}
      onClose={() => {
        leaveDetailScreen(id);
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
    />
  );
}
