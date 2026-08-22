/**
 * Shared Tavily client (D5). Plain `fetch` — no SDK dependency needed for
 * two REST calls. Extract feeds page text + product images (D2); Search
 * feeds the review hooks.
 */

const BASE_URL = "https://api.tavily.com";

function apiKey(): string {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("TAVILY_API_KEY not set");
  return key;
}

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Tavily ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export type TavilyExtractResult = {
  url: string;
  rawContent: string;
  imageUrls: string[];
};

export async function extractPage(url: string): Promise<TavilyExtractResult> {
  const data = await post<{
    results: { url: string; raw_content: string; images?: string[] }[];
  }>("/extract", { urls: [url], include_images: true, extract_depth: "advanced" });

  const hit = data.results[0];
  if (!hit) throw new Error(`Tavily extract returned no results for ${url}`);
  return { url: hit.url, rawContent: hit.raw_content, imageUrls: hit.images ?? [] };
}

export type TavilySearchResult = {
  title: string;
  url: string;
  content: string;
};

export async function tavilySearch(
  query: string,
  opts: { maxResults?: number } = {}
): Promise<TavilySearchResult[]> {
  const data = await post<{
    results: { title: string; url: string; content: string }[];
  }>("/search", {
    query,
    search_depth: "advanced",
    max_results: opts.maxResults ?? 8,
  });
  return data.results;
}
