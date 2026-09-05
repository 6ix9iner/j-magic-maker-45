/**
 * Safely extracts a human-readable message from a caught value of type
 * `unknown` (what a catch binding actually is under strict TS - the
 * runtime can throw anything, not just an Error). Use this instead of
 * `catch (error: any) { ... error.message ... }`, which silences the type
 * checker on the one place it would actually catch a real mistake (code
 * that assumes every thrown value is an Error-shaped object).
 */
export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
}
