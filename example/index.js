/**
 * App entry.
 *
 * `expo-router/entry` registers "main", which MainActivity mounts. VRActivity
 * mounts a *different* root — "VRQuestScene" — so that registration has to
 * happen at startup too, not when the /xr route is first visited: entering XR
 * launches VRActivity immediately, and a lazily-loaded route would register
 * the component after the activity had already gone looking for it.
 *
 * Registering after importing expo-router/entry deliberately overrides Viro's
 * own auto-registration. See VrSceneRoot for why its entry point cannot work
 * on PICO.
 */
import 'expo-router/entry';
import { AppRegistry } from 'react-native';

import { VrSceneRoot } from './src/scene/VrSceneRoot';

AppRegistry.registerComponent('VRQuestScene', () => VrSceneRoot);
