import { NextRequest } from "next/server";
import { avatarSpot } from "@/lib/stages/avatar";
import { parseBrief } from "@/lib/brief";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { url?: string; brief?: unknown };
  const url = body.url;
  if (!url) {
    return Response.json({ error: "url required" }, { status: 400 });
  }
  try {
    const result = await avatarSpot(url, parseBrief(body.brief));
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
