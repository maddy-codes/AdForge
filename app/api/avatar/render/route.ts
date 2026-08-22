import { NextRequest } from "next/server";
import { isAvatarId, renderAvatarSpot } from "@/lib/stages/avatar";

export const runtime = "nodejs";
// VEED avatar generation runs for minutes — give the poll room to finish.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { avatarId, vo, scenePrompt, voiceDescription, productImage } =
    (await req.json()) as {
      avatarId?: string;
      vo?: string;
      scenePrompt?: string;
      voiceDescription?: string;
      productImage?: string | null;
    };
  if (!avatarId || !vo) {
    return Response.json({ error: "avatarId and vo required" }, { status: 400 });
  }
  if (!isAvatarId(avatarId)) {
    return Response.json({ error: `unknown avatarId: ${avatarId}` }, { status: 400 });
  }
  try {
    const result = await renderAvatarSpot({
      avatarId,
      vo,
      scenePrompt: typeof scenePrompt === "string" ? scenePrompt : undefined,
      voiceDescription:
        typeof voiceDescription === "string" ? voiceDescription : undefined,
      productImage: typeof productImage === "string" ? productImage : null,
    });
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
