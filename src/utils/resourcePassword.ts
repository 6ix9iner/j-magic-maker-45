import { supabase } from "@/integrations/supabase/client";

export type ResourceLock = "inventory" | "sales";

// Simple, non-cryptographic hash used for the Inventory/Sales screen
// locks (NOT the account login password) - mirrored exactly by
// reset-resource-password (edge function) and by
// InventoryPasswordSettings.tsx / SalesPasswordSettings.tsx so a hash
// produced by any of them verifies correctly against the others.
export function hashResourcePassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
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
