import { NextRequest } from "next/server";
import { competitorIntel } from "@/lib/stages/intel";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { url } = (await req.json()) as { url?: string };
  if (!url) {
    return Response.json({ error: "url required" }, { status: 400 });
  }
  try {
    const result = await competitorIntel(url);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
