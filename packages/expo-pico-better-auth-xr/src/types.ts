/** A provider subject is trustworthy only after the backend has verified a platform credential. */
export interface VerifiedXRIdentity {
  /** Immutable, platform-assigned subject from server-side validation, never from the client body. */
  subject: string;
  name?: string;
  image?: string | null;
}

export type XRProof =
  | { provider: 'pico'; authCode: string }
  | { provider: 'meta-horizon'; userId: string; nonce: string };

export interface XRVerification {
  /** Exchange and validate the PICO auth code with the official platform backend. */
  verifyPicoAuthCode?: (authCode: string) => Promise<VerifiedXRIdentity>;
  /** Verify Meta's one-use user-proof nonce server-to-server against the claimed user id. */
  verifyMetaUserProof?: (proof: {
    userId: string;
    nonce: string;
  }) => Promise<VerifiedXRIdentity>;
}
