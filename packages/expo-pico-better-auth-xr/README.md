# Better Auth XR identities

Verified PICO OS and Meta Horizon identities, backed by one Better Auth user and session system. PICO authentication continues to come from the existing `@expo-pico/account` package; this package does not replace or duplicate it.

## How it works

- PICO: `@expo-pico/account.sendAuthScopesRequest(scopes, 'auth-code')` obtains a code from the PICO Platform Service account session. The **server** must exchange/validate that code with the official PICO identity service and return an immutable verified subject. There is deliberately **no unverified fallback** to `getUserProfile().userId` or to a raw client access token.
- Meta: the headset SDK supplies an app-scoped user ID and a **one-use** `getUserProof()` nonce. The included server helper checks the nonce with `https://graph.oculus.com/user_nonce_validate` before accepting the Meta user ID. Configure Meta App ID and App Secret on the server.
- Better Auth: the server plugin creates or finds an `account` entry with `providerId = pico | meta-horizon` and the validated external subject in `accountId`. All connected methods point to **one** Better Auth `user.id`.
- Google: use Better Auth's existing `linkSocial({ provider: 'google' })` while signed into the PICO/Meta-backed app session. No custom Google OAuth implementation is needed.

These are platform-specific identities, **not general browser OAuth buttons**. Desktop/web users should sign in with Google or another configured Better Auth method.

## Install in the monorepo

Add `packages/expo-pico-better-auth-xr` to the root Yarn workspaces, then run `yarn install` to update the lockfile.

Server: `@expo-pico/better-auth-xr/server`. PICO native client: `@expo-pico/better-auth-xr/pico`. Meta adapter: `@expo-pico/better-auth-xr/meta`.

### Server configuration

```ts
import { betterAuth } from 'better-auth';
import { xrIdentity } from '@expo-pico/better-auth-xr/server';
import { createMetaUserProofVerifier } from '@expo-pico/better-auth-xr/meta';

export const auth = betterAuth({
  // Existing database + Better Auth configuration.
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
    xrIdentity({
      // REQUIRED: implement using official PICO S2S auth-code exchange and
      // profile validation for YOUR PICO app. Do not return a client-supplied uid.
      verifyPicoAuthCode: async (code) => {
        const verified = await verifyPicoAuthCodeOnServer(code);
        return { subject: verified.openUid, name: verified.displayName };
      },
      verifyMetaUserProof: createMetaUserProofVerifier({
        appId: process.env.META_APP_ID!,
        appSecret: process.env.META_APP_SECRET!,
      }),
    }),
  ],
});
```

`verifyPicoAuthCodeOnServer` is **an integration point, not a function supplied by this package**. Its endpoint and parameters must be confirmed against the developer account's current PICO Platform Service documentation and service enablement before deploying. Leaving the callback unset fails closed. The native module's `getAccountLinkStatus()` currently returns `unsupported`; Better Auth `listAccounts()` is the authoritative account-link status in the app.

### PICO app

```ts
import { getPicoXRProof } from '@expo-pico/better-auth-xr/pico';

const proof = await getPicoXRProof();
await authClient.$fetch('/xr-identity/sign-in', { method: 'POST', body: proof });

// From Settings, when already signed in:
// await authClient.$fetch('/xr-identity/link', { method: 'POST', body: proof });
```

Use Better Auth's Expo client plugin for cookie/session handling in native apps and secure token storage. The server returns a Better Auth session token, **never** a platform access token. Your app still needs a native cookie/session persistence strategy that survives an app restart.

### Meta Horizon app

```ts
import { getMetaXRProof } from '@expo-pico/better-auth-xr/meta';

// The app's Meta Platform SDK adapter must get both values.
const proof = getMetaXRProof({ userId: metaUserId, nonce: metaOneUseProof });
await authClient.$fetch('/xr-identity/sign-in', { method: 'POST', body: proof });
```

Request Meta's User Verification feature and complete its Data Use Checkup before production. User-proof nonce validation does **not** replace entitlement checks.

### Settings: link Google and inspect methods

```ts
await authClient.linkSocial({ provider: 'google', callbackURL: '/settings/connected-accounts' });
const { data: accounts } = await authClient.listAccounts();
// Render Pico, Meta, Google, and other provider rows from these account records.
// To unlink, supply the local account row id per Better Auth 1.7, and don't
// remove the last working authentication method.
```

### Separate existing users versus adding an authentication method

`/xr-identity/link` attaches an XR identity to the **currently authenticated** Better Auth user. If that provider identity belongs to another Better Auth user, the endpoint returns `409 CONFLICT` and DOES NOT move or delete user data. Merging two existing application users requires the user to reauthenticate **both**, inspect domain-specific conflicts (purchases, classrooms, saved data, roles, organization ownership), transactionally transfer records, revoke the source account's sessions, and only then retire the source user. That is not safe to auto-merge on an email/name match.

### Migration and production gates

1. Run Better Auth's database migration for your selected adapter. Ensure that `account(providerId, accountId)` is unique in the app's real database (check for duplicates first; use your adapter's migration tooling). This prevents two simultaneous first-logins for the same platform identity creating separate users.
2. Confirm the PICO S2S verifier with real headset test credentials and an app-level PICO developer identity. Test expired and replayed codes, profile mismatch, and service outages.
3. Configure Meta verification, test proof reuse fails, and ensure server-only secrets never enter JS bundles.
4. Confirm session persistence on Android headsets and Expo Web, including logout, restart, and Google link callbacks.
5. Test `409` account ownership conflicts, account enumeration, link/unlink lockout prevention, and credential redaction from logs.
6. Reinstall to refresh `yarn.lock`, run `yarn typecheck && yarn test && yarn lint`, and validate on PICO and Quest hardware before publishing. This source PR has not been validated on a headset.
