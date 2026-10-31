import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { env } from "@api/env";

/** What the API needs from a verified Google ID token. */
export type GoogleIdentity = {
  /** Google account id (stable). */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

/** Verifies a Google Identity Services credential (ID token) for `clientId`; throws when it isn't valid. */
export type GoogleVerifier = (credential: string, clientId: string) => Promise<GoogleIdentity>;

const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

/**
 * A verifier checking the token's signature against Google's public keys, its issuer, audience
 * (our OAuth client id) and expiry. `keys` is only replaced in tests (a local key set).
 */
export function createGoogleVerifier(keys?: JWTVerifyGetKey): GoogleVerifier {
  // Created on first use: jose fetches and caches Google's keys (and refreshes them on rotation).
  let jwks = keys;
  return async (credential, clientId) => {
    jwks ??= createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
    const { payload } = await jwtVerify(credential, jwks, { issuer: GOOGLE_ISSUERS, audience: clientId, algorithms: ["RS256"] });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") throw new Error("Google token without sub/email");
    return {
      sub: payload.sub,
      email: payload.email,
      // Google sends a boolean; anything else counts as not verified.
      emailVerified: payload.email_verified === true,
      name: typeof payload.name === "string" ? payload.name : null,
    };
  };
}

let verifier: GoogleVerifier = createGoogleVerifier();

export function verifyGoogleCredential(credential: string, clientId: string) {
  return verifier(credential, clientId);
}

/** Tests only: replace the verifier (pass null to restore the real one). */
export function setGoogleVerifier(v: GoogleVerifier | null) {
  verifier = v ?? createGoogleVerifier();
}

/** The OAuth client id, or null when Google sign-in isn't configured on this server. */
export function googleClientId(): string | null {
  return env.GOOGLE_CLIENT_ID || null;
}
