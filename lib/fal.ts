import { fal } from "@fal-ai/client";

/**
 * Shared fal client config (D6). Configured once from FAL_KEY; every stage
 * that needs fal imports this instead of calling `fal.config` itself.
 */
let configured = false;

export function getFal() {
  if (!configured) {
    fal.config({ credentials: process.env.FAL_KEY });
    configured = true;
  }
  return fal;
}
