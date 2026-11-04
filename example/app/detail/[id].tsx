import React from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { useShellStore } from '../../src/layout/detailPanel.store';
import { isDetailId } from '../../src/layout/shell';
import { DetailSurface } from '../../src/ui/DetailSurface';

/**
 * Detail as a pushed screen: on phones, and on a headset whose detail panel
 * could not open. Close clears the selection and returns to the route below.
 */
export default function Detail(): React.JSX.Element {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clear = useShellStore((state) => state.clear);
  if (!isDetailId(id)) return <Redirect href="/" />;
  return (
    <DetailSurface
      id={id}
      onClose={() => {
        clear();
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
    />
  );
}
