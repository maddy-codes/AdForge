/**
 * D3-C: pre-train the demo product's brand LoRA at boot so the live run
 * during the demo hits a warm disk cache instead of a multi-minute training
 * job. No-op if FAL_KEY is absent or the URL is already cached.
 *
 * The `if (process.env.NEXT_RUNTIME === 'nodejs') { await import(...) }`
 * shape (not an early-return guard) is required — Next only excludes the
 * dynamic import from the edge runtime bundle when it matches this exact
 * pattern, and lora.ts pulls in node:crypto which the edge bundler rejects.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
