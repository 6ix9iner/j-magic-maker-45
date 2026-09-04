import { supabase } from "@/integrations/supabase/client";

export type ResourceLock = "inventory" | "sales";

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveBits(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

/** The original hash used for the Inventory/Sales screen locks - a plain,
 * unsalted 32-bit checksum (no cryptographic strength at all: trivially
 * reversible/brute-forceable and every user with the same password gets
 * the same hash). Kept ONLY so passwords set before the PBKDF2 upgrade
 * below keep verifying; never used to hash a new or changed password. */
function legacyHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString();
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Hashes a password for storage with PBKDF2-SHA256 and a fresh random
 * salt (100,000 iterations). Always used for new/changed passwords - the
 * stored format is self-describing (`pbkdf2$<iterations>$<salt>$<hash>`,
 * all base64) so verification never needs to guess parameters. Mirrored
 * exactly in the reset-resource-password edge function. */
export async function hashResourcePassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await deriveBits(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

/** Verifies a password against a stored hash. Transparently accepts the
 * old non-cryptographic format too, so passwords set before this upgrade
 * keep working without forcing anyone to reset - only new/changed
 * passwords get the stronger PBKDF2 format. */
export async function verifyResourcePassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;

  if (stored.startsWith("pbkdf2$")) {
    const parts = stored.split("$");
    if (parts.length !== 4) return false;
    const [, iterationsStr, saltB64, hashB64] = parts;
    const iterations = parseInt(iterationsStr, 10);
    if (!Number.isFinite(iterations) || iterations <= 0) return false;
    try {
      const salt = fromBase64(saltB64);
      const expected = fromBase64(hashB64);
      const derived = await deriveBits(password, salt, iterations);
      return constantTimeEqual(derived, expected);
    } catch {
      return false;
    }
  }

  return legacyHash(password) === stored;
}

/** Sends a "reset your Inventory/Sales password" email to the signed-in
 * user's own account address. Requires an active session - this is for
 * someone locked out of a specific screen, not their whole account. */
export async function requestResourcePasswordReset(resource: ResourceLock): Promise<void> {
  const { error } = await supabase.functions.invoke("request-resource-password-reset", {
    body: { resource },
  });
  if (error) throw error;
}

/** Completes a reset using the single-use token from the emailed link.
 * No session required - the token itself is the credential. */
export async function completeResourcePasswordReset(token: string, newPassword: string): Promise<ResourceLock> {
  const { data, error } = await supabase.functions.invoke("reset-resource-password", {
    body: { token, new_password: newPassword },
  });
  if (error) throw error;
  return data.resource as ResourceLock;
}
