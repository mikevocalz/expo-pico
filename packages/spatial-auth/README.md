# Spatial Auth

A Better Auth plugin for spatial identities, with a separate Expo Modules v2 bridge (`expo-spatial-auth`) for Android-based headsets.

`spatial-auth` is server-side identity and account linking. It does not contain Android or XR rendering code. `expo-spatial-auth` is the Android native adapter for Meta Horizon and Google Credential Manager. Existing `@expo-pico/account` remains the PICO native adapter.

## Auth provider matrix

| Platform | How the proof is acquired | Server verification |
| --- | --- | --- |
| Meta Quest 3 / Horizon | `expo-spatial-auth.getMetaUserProof()` | Meta one-time user nonce via `user_nonce_validate` |
| PICO 4 / Ultra / Swan | `@expo-pico/account.sendAuthScopesRequest([], 'auth-code')` | Developer-approved PICO code exchange and subject lookup callback; must be configured |
| Android XR (Samsung / Google) | `expo-spatial-auth.getGoogleIdToken()` using Credential Manager | Better Auth built-in Google ID token verification. Reuses the **google** provider, not an invented android-xr identity |
| Snap Specs / Lens Studio | Snap Cloud automatically provides a project-scoped OIDC-backed session | Trusted Snap Cloud / Mobile Kit backend issues a one-use account-handoff ticket; only the backend can attest the wearer |
| Web / iOS / Android | Better Auth social provider, passkeys, email | Better Auth |

The `snap-specs` adapter does **not** access Snap OS tokens from a Lens. A verified backend handoff is required, and the callback fails closed until implemented.

## Server

```ts
import { betterAuth } from 'better-auth';
import { spatialAuth } from 'spatial-auth/server';
import { createMetaUserProofVerifier } from 'spatial-auth/meta';

export const auth = betterAuth({
  // Keep your existing database, sessions, and social providers.
  account: {
    accountLinking: {
      enabled: true,
      disableImplicitLinking: true,
      allowDifferentEmails: true,
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    spatialAuth({
      verifyMetaUserProof: createMetaUserProofVerifier({
        appId: process.env.META_APP_ID!,
        appSecret: process.env.META_APP_SECRET!,
      }),
      verifyPicoAuthCode: async (code) => {
        // Required: implement verified S2S exchange using YOUR enabled PICO service.
        const account = await verifyPicoCodeWithOfficialService(code);
        return { subject: account.openUid };
      },
      verifySnapSpecsTicket: async (ticket) => {
        // Required: consume an app-issued one-time ticket via a trusted service.
        const account = await consumeVerifiedSnapCloudHandoff(ticket);
        return { subject: account.snapUserId };
      },
    }),
  ],
});
```

Both `verifyPicoCodeWithOfficialService` and `consumeVerifiedSnapCloudHandoff` are **application-provided integration functions**, not functions shipped by this library. You must implement and verify these before enabling those providers.

The plugin mounts `POST /spatial-auth/sign-in` and `POST /spatial-auth/link`.

## Expo Modules v2 (Quest / Android XR)

```ts
import { getMetaUserProof, getGoogleIdToken } from 'expo-spatial-auth';
import { getPicoXRProof } from 'spatial-auth/pico';

const meta = await getMetaUserProof(); // { userId, nonce }, Meta Quest runtime only
await authClient.$fetch('/spatial-auth/sign-in', {
  method: 'POST',
  body: { provider: 'meta-horizon', userId: meta.userId, nonce: meta.nonce },
});

const pico = await getPicoXRProof();
await authClient.$fetch('/spatial-auth/sign-in', { method: 'POST', body: pico });

// Android XR: use Google's Credential Manager result as a Google identity.
// It MUST be verified by Better Auth Google, NOT by /spatial-auth/sign-in.
const result = await getGoogleIdToken(GOOGLE_WEB_CLIENT_ID, nonce);
await authClient.signIn.social({ provider: 'google', idToken: { token: result.idToken, nonce } });
```

In Settings, call `authClient.linkSocial({ provider: 'google' })` or pass a verified Google ID token through Better Auth's existing account-link API. Use `authClient.listAccounts()` as the source of connected methods.

`/spatial-auth/link` attaches a new verified identity to the current user. It returns 409 if that identity belongs to **another** user. Do not silently merge database accounts by email, alias or claimed headset ID. A full two-user merge needs reauthentication of both users and transaction-safe migration of app domain data.

## Required deployment gates

- Meta Horizon account API needs platform SDK access and Data Use Checkup. `getLoggedInUser` and `getUserProof` require an authenticated Quest/Simulator; check native behavior on a Quest 3.
- Google Android XR Credential Manager requires Android XR API level 34, GMS support, and supported system image. QR-initiated flows are not supported. It provides a **Google** credential, not proof of an XR device's owner.
- Snap Cloud alpha access and appropriate consent are needed for its project-scoped Snap identity. Snap user OIDC tokens are not available to arbitrary Lens JavaScript. The trusted ticket exchange is a design seam, not an implemented Snap Cloud service.
- PICO needs its real server-side code verifier; never use `getUserProfile().userId` as proof.
- Apply the database uniqueness invariant for `account(providerId, accountId)`, install `yarn.lock` dependencies, test account collisions, reauth, last-sign-in-method removal, and session persistence.
- Device builds and production provider authentication must be validated before publishing. This monorepo is the integration staging area; extracting Spatial Auth into its own independent repository should not import any PICO-specific runtime dependency on the Better Auth server.
