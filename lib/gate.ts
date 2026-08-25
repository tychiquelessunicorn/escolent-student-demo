export const GATE_COOKIE = "escolent_demo_gate";

/**
 * Shared-password gate for the public demo. This is demo infrastructure — it
 * guards a low Anthropic balance against random discovery — and is deliberately
 * separate from Requirement 1.7-1.8's direct-open session states, which are
 * product behaviour and live inside Practice Session.
 *
 * The cookie holds a hash rather than the password itself, so the password is
 * never sitting in a readable cookie or in a request after sign-in.
 */
export async function gateToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`escolent-demo:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function gateIsEnabled(): boolean {
  return Boolean(process.env.DEMO_PASSWORD);
}
