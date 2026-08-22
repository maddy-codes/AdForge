import { ConvexHttpClient } from "convex/browser";

/**
 * Server-side Convex client. The Next.js route is the pipeline orchestrator
 * (it owns the partner API keys), and this is how it persists state to
 * Convex. A fresh client per call site keeps auth from bleeding between the
 * request-scoped create and the background workers.
 */
export function getConvexServer(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return new ConvexHttpClient(url);
}
