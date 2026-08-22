import { randomUUID } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexServer } from "@/lib/convexServer";

export type JobKind = "forge" | "intel" | "avatar";

export async function mintJob(
  url: string,
  kind: JobKind,
  sessionId?: string
): Promise<{ jobId: Id<"jobs">; token: string }> {
  const token = randomUUID();
  const convex = getConvexServer();
  const session = await auth().catch(() => null);
  const authToken = await session
    ?.getToken({ template: "convex" })
    .catch(() => undefined);
  if (authToken) convex.setAuth(authToken);
  const jobId = await convex.mutation(api.jobs.create, {
    url,
    token,
    kind,
    sessionId: sessionId?.trim() || undefined,
  });
  return { jobId, token };
}
