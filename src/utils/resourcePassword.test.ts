import { describe, it, expect } from "vitest";
import { hashResourcePassword, verifyResourcePassword } from "./resourcePassword";

// These exercise the Inventory/Sales screen-lock hashing directly - the
// same logic that must stay byte-compatible with the reset-resource-password
// edge function's mirrored implementation (supabase/functions/reset-resource-password).

describe("hashResourcePassword / verifyResourcePassword (PBKDF2 format)", () => {
  it("verifies a password against its own freshly-computed hash", async () => {
    const hash = await hashResourcePassword("correct-horse-battery-staple");
    await expect(verifyResourcePassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashResourcePassword("the-real-password");
    await expect(verifyResourcePassword("a-guess", hash)).resolves.toBe(false);
  });

  it("produces a different hash each time (random salt), even for the same password", async () => {
    const a = await hashResourcePassword("same-password");
    const b = await hashResourcePassword("same-password");
    expect(a).not.toBe(b);
    // ...but both must still verify correctly against that same password.
    await expect(verifyResourcePassword("same-password", a)).resolves.toBe(true);
    await expect(verifyResourcePassword("same-password", b)).resolves.toBe(true);
  });

  it("stores the hash in the documented self-describing format", async () => {
    const hash = await hashResourcePassword("whatever");
    expect(hash).toMatch(/^pbkdf2\$\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  });

  it("rejects an empty/undefined/null stored hash instead of throwing", async () => {
    await expect(verifyResourcePassword("anything", "")).resolves.toBe(false);
    await expect(verifyResourcePassword("anything", null)).resolves.toBe(false);
    await expect(verifyResourcePassword("anything", undefined)).resolves.toBe(false);
  });

  it("rejects a malformed pbkdf2-prefixed hash instead of throwing", async () => {
    await expect(verifyResourcePassword("anything", "pbkdf2$not$enough$parts$here")).resolves.toBe(false);
    await expect(verifyResourcePassword("anything", "pbkdf2$notanumber$c2FsdA==$aGFzaA==")).resolves.toBe(false);
  });
});

describe("verifyResourcePassword (legacy format backward-compatibility)", () => {
  // The original hash used before the PBKDF2 upgrade: a plain
  // JS-String.hashCode()-style 32-bit checksum, stored as a decimal string.
  // Accounts that set their password before the upgrade must keep working
  // without being forced to reset.
  function legacyHash(password: string): string {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  it("still verifies a password against an old-format hash", async () => {
    const oldHash = legacyHash("my-old-password");
    await expect(verifyResourcePassword("my-old-password", oldHash)).resolves.toBe(true);
  });

  it("rejects the wrong password against an old-format hash", async () => {
    const oldHash = legacyHash("my-old-password");
    await expect(verifyResourcePassword("wrong-guess", oldHash)).resolves.toBe(false);
  });
});
