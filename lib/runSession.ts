const KEY = "adforge_session";

/** Stable per-browser id so guest runs stay listed after you leave the page. */
export function ensureRunSession(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

export function runHref(
  kind: "forge" | "intel" | "avatar",
  jobId: string
): string {
  if (kind === "intel") return `/intel?job=${jobId}`;
  if (kind === "avatar") return `/avatar?job=${jobId}`;
  return `/forge?job=${jobId}`;
}

export function runLabel(kind: "forge" | "intel" | "avatar"): string {
  if (kind === "intel") return "Intel";
  if (kind === "avatar") return "Avatar";
  return "Films";
}
