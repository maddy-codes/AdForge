/**
 * Pioneer client (D4 fallback path) — zero-shot GLiNER2, no fine-tune needed.
 * `fastino/gliner2-base-v1` pulls schema-defined entities straight out of raw
 * page text. Plain `fetch`, matching the Tavily client shape.
 */

const BASE_URL = "https://api.pioneer.ai";
const MODEL_ID = "fastino/gliner2-base-v1";

function apiKey(): string {
  const key = process.env.PIONEER_API_KEY;
  if (!key) throw new Error("PIONEER_API_KEY not set");
  return key;
}

type EntitySpan = { text: string; label?: string; score?: number };

type EncoderInferenceResponse = {
  type: string;
  inference_id: string;
  result: Record<string, EntitySpan[] | string[]> | EntitySpan[];
};

/** Zero-shot entity extraction: text in, `{ entityName: string[] }` out. */
export async function extractEntities(
  text: string,
  entityNames: string[]
): Promise<Record<string, string[]>> {
  const res = await fetch(`${BASE_URL}/inference`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey(),
    },
    body: JSON.stringify({
      model_id: MODEL_ID,
      text: text.slice(0, 8000),
      schema: { entities: entityNames.map((name) => ({ name })) },
      threshold: 0.4,
    }),
  });
  if (!res.ok) {
    throw new Error(`Pioneer inference failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as EncoderInferenceResponse;
  return normalizeResult(data.result, entityNames);
}

/** Unwrap a response that nests spans under an `entities` key instead of being flat. */
function unwrapEntities(
  result: EncoderInferenceResponse["result"]
): EncoderInferenceResponse["result"] {
  if (
    !Array.isArray(result) &&
    result &&
    typeof result === "object" &&
    "entities" in result
  ) {
    return (result as { entities: EncoderInferenceResponse["result"] }).entities;
  }
  return result;
}

/** The API can return entities keyed by name (any case) or as a flat labeled array — handle both. */
function normalizeResult(
  rawResult: EncoderInferenceResponse["result"],
  entityNames: string[]
): Record<string, string[]> {
  const result = unwrapEntities(rawResult);
  const out: Record<string, string[]> = Object.fromEntries(
    entityNames.map((name) => [name, []])
  );
  const byLowerName = new Map(entityNames.map((name) => [name.toLowerCase(), name]));

  if (Array.isArray(result)) {
    for (const span of result) {
      const label = span.label;
      const key = label && byLowerName.get(label.toLowerCase());
      if (key) out[key].push(span.text);
    }
    return out;
  }

  for (const [rawName, spans] of Object.entries(result ?? {})) {
    const name = byLowerName.get(rawName.toLowerCase());
    if (!name || !Array.isArray(spans)) continue;
    out[name] = spans.map((s) => (typeof s === "string" ? s : s.text)).filter(Boolean);
  }

  if (Object.values(out).every((v) => v.length === 0)) {
    console.warn(
      "[pioneer] extraction returned zero entities for all fields — raw response:",
      JSON.stringify(rawResult).slice(0, 500)
    );
  }
  return out;
}
