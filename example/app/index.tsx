import React from 'react';
import { useRouter } from 'expo-router';

import { HomeScreen, type HomeRoute } from '../src/ui/HomeScreen';

export default function Index(): React.JSX.Element {
  const router = useRouter();
  return <HomeScreen onNavigate={(route: HomeRoute) => router.push(`/${route}`)} />;
}
