import { NextRequest, NextResponse, after } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexServer } from "@/lib/convexServer";
import { avatarSpot, renderAvatarSpot } from "@/lib/stages/avatar";
import { parseBrief, type AdBrief } from "@/lib/brief";
import { mintJob } from "@/lib/kickoffJob";

export const runtime = "nodejs";
export const maxDuration = 300;

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
    "avatar",
    typeof body.sessionId === "string" ? body.sessionId : undefined
  );
  after(() => runAvatar(jobId, token, url, brief));
  return NextResponse.json({ jobId }, { status: 202 });
}

async function runAvatar(
  jobId: Id<"jobs">,
  token: string,
  url: string,
  brief?: AdBrief
) {
  const convex = getConvexServer();
  const job = { jobId, token };
  try {
    await convex.mutation(api.jobs.stageRunning, { ...job, stage: "extract" });
    const spot = await avatarSpot(url, brief);
    await convex.mutation(api.jobs.recordAvatarSpot, { ...job, spot });
    try {
      const video = await renderAvatarSpot({
        avatarId: spot.avatarId,
        vo: spot.vo,
        scenePrompt: spot.scenePrompt,
        voiceDescription: spot.voiceDescription,
        productImage: spot.productImage,
      });
      await convex.mutation(api.jobs.recordAvatarVideo, { ...job, video });
    } catch (err) {
      await convex.mutation(api.jobs.recordAvatarVideo, {
        ...job,
        renderNote: `VEED render didn't land (${
          err instanceof Error ? err.message : String(err)
        }) — brief below still stands.`,
      });
    }
  } catch (err) {
    await convex
      .mutation(api.jobs.fail, {
        ...job,
        message: err instanceof Error ? err.message : String(err),
      })
      .catch((persistErr) =>
        console.error("[avatar] failed to persist job failure:", persistErr)
      );
  }
}
