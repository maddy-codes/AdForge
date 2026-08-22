import { NextRequest, NextResponse, after } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexServer } from "@/lib/convexServer";
import { competitorIntel } from "@/lib/stages/intel";
import { parseBrief, type AdBrief } from "@/lib/brief";
import { mintJob } from "@/lib/kickoffJob";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    url?: string;
    brief?: unknown;
    sessionId?: string;
  };
  const url = body.url;
  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }
  const brief = parseBrief(body.brief);
  const { jobId, token } = await mintJob(
    url,
    "intel",
    typeof body.sessionId === "string" ? body.sessionId : undefined
  );
  after(() => runIntel(jobId, token, url, brief));
  return NextResponse.json({ jobId }, { status: 202 });
}

async function runIntel(
  jobId: Id<"jobs">,
  token: string,
  url: string,
  brief?: AdBrief
) {
  const convex = getConvexServer();
  const job = { jobId, token };
  try {
    await convex.mutation(api.jobs.stageRunning, { ...job, stage: "extract" });
    const result = await competitorIntel(url, brief);
    await convex.mutation(api.jobs.recordIntel, { ...job, result });
  } catch (err) {
    await convex
      .mutation(api.jobs.fail, {
        ...job,
        message: err instanceof Error ? err.message : String(err),
      })
      .catch((persistErr) =>
        console.error("[intel] failed to persist job failure:", persistErr)
      );
  }
}
