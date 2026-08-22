import OpenAI from "openai";

/**
 * Shared OpenAI client (D9 step 3 — creative director).
 * Instantiated once from OPENAI_API_KEY; concepts imports this instead of
 * constructing its own client.
 */
let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}
