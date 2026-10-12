# expo-spatial-auth

Expo Modules **v2** native platform adapter for Spatial Auth. This package targets Expo SDK 58 and Android builds, without Nitro. The Better Auth server plugin is the separate `spatial-auth` package.

- **Meta Quest / Horizon OS:** initialize Horizon Platform SDK using the public `horizonAppId` Gradle property provided by `expo-horizon-core`, then use native Kotlin `Users().getLoggedInUser()` and `Users().getUserProof()` from Meta Horizon Platform SDK v0.2.2. Returned one-time proof MUST go to a trusted Better Auth server running `createMetaUserProofVerifier()`.
- **Google Android XR:** native Credential Manager + Google ID SDK. `getGoogleIdToken(webClientId, nonce)` returns a token that must be passed to Better Auth's **Google** provider, with verification of audience, issuer, expiry and nonce. Google on-device login is not necessarily automatic approval to your app.
- **PICO:** use existing `@expo-pico/account`. Spatial Auth server plugin exchanges its auth-code on the backend.
- **Snap Specs:** Lens Studio is a separate runtime, not an Android Expo app. Use a separately verified Snap Cloud/Mobile Kit account handoff, not an imaginary Expo native method.

### Add to an Expo app

```json
{
  "plugins": [
    ["expo-horizon-core", { "horizonAppId": "YOUR_APP_ID" }],
    ["expo-spatial-auth", { "metaHorizon": true }]
  ]
}
```

`metaHorizon: true` only applies to projects defining a `quest` Gradle flavor. The plugin adds Meta Kotlin Users/Core SDK **only** to that flavor and raises the Quest flavor's minimum Android SDK to 34. PICO and phone flavors do not receive the Meta runtime.

```ts
import { getMetaUserProof, getGoogleIdToken } from 'expo-spatial-auth';

const proof = await getMetaUserProof();
await authClient.$fetch('/spatial-auth/sign-in', {
  method: 'POST',
  body: { provider: 'meta-horizon', userId: proof.userId, nonce: proof.nonce },
});

// On Google Android XR, use existing Better Auth Google provider instead:
const google = await getGoogleIdToken(GOOGLE_WEB_CLIENT_ID, serverNonce);
await authClient.signIn.social({
  provider: 'google',
  idToken: { token: google.idToken, nonce: serverNonce },
});
```

**Integration is subject to Meta DUC and hardware tests.** Expo Modules registration is native only: changes require a new dev-client build. For web, use Better Auth's Google/social login. In Snap Lens Studio, authentication is mediated by Snap Cloud OS, not Android.

Sources: https://developers.meta.com/vr/documentation/android-apps/ps-ownership/ and https://developer.android.com/identity/form-factors and https://eng.snap.com/spectacles_supabase
