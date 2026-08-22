"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { Concept, RenderResult, ReviewHook } from "@/lib/types";

const GLOWS = [
  "shadow-[0_24px_60px_-20px_rgb(255_77_46/0.55)]",
  "shadow-[0_24px_60px_-20px_rgb(200_245_74/0.7)]",
  "shadow-[0_24px_60px_-20px_rgb(201_183_255/0.7)]",
];

/**
 * Comparison is the card. Sliding bezel is the 2-meter signal;
 * drag-wipe is the close-up. Generic is an invented still; on-pack is
 * the listing photo composited into the film.
 */
export default function AdCard({
  index,
  concept,
  result,
  review,
}: {
  index: number;
  concept: Concept;
  result: RenderResult;
  review?: ReviewHook;
}) {
  const [showGeneric, setShowGeneric] = useState(false);
  const [wipe, setWipe] = useState<number | null>(null);
  const [shareState, setShareState] = useState<
    "idle" | "working" | "shared" | "copied" | "saved"
  >("idle");
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const canCompare = Boolean(result.genericKeyframeUrl && result.keyframeUrl);

  const genericReveal = wipe ?? (showGeneric ? 1 : 0);
  const genericActive = wipe !== null ? wipe >= 0.5 : showGeneric;

  function ratio(clientX: number) {
    const el = frameRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!canCompare) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setWipe(ratio(e.clientX));
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    setWipe(ratio(e.clientX));
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    const next = ratio(e.clientX);
    setShowGeneric(next >= 0.5);
    setWipe(null);
  }

  function select(generic: boolean) {
    setWipe(null);
    setShowGeneric(generic);
  }

  const filename = `adforge-${String(index + 1).padStart(2, "0")}.mp4`;
  const caption = concept.hook;

  async function shareOut() {
    setShareState("working");
    try {
      const outcome = await shareVideo(result.videoUrl, caption, filename);
      setShareState(outcome);
      window.setTimeout(() => setShareState("idle"), 1800);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setShareState("idle");
        return;
      }
      setShareState("idle");
    }
  }

  async function downloadOut() {
    setShareState("working");
    try {
      await downloadVideo(result.videoUrl, caption, filename);
      setShareState("saved");
      window.setTimeout(() => setShareState("idle"), 1800);
    } catch {
      setShareState("idle");
    }
  }

  return (
    <article
      className="rise group"
      style={{ animationDelay: `${index * 110}ms` }}
    >
      <div
        className={`phone-lift relative rounded-[36px] border border-white bg-surface p-2.5 transition-transform duration-300 group-hover:-translate-y-2 ${GLOWS[index % GLOWS.length]}`}
      >
        <div
          ref={frameRef}
          className={`relative aspect-[9/16] overflow-hidden rounded-[28px] bg-ink ${
            canCompare ? "cursor-ew-resize touch-none" : ""
          }`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {canCompare && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.genericKeyframeUrl}
              alt="Generic — invented pack"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <video
            src={result.videoUrl}
            poster={result.keyframeUrl}
            className={
              canCompare
                ? `absolute inset-0 h-full w-full object-cover ${
                    wipe === null
                      ? "transition-[clip-path] duration-[180ms]"
                      : ""
                  }`
                : "h-full w-full object-cover"
            }
            style={
              canCompare
                ? { clipPath: `inset(0 0 0 ${genericReveal * 100}%)` }
                : undefined
            }
            autoPlay
            loop
            muted
            playsInline
          />

          <span
            className="pointer-events-none absolute top-2.5 left-1/2 z-20 h-5 w-[72px] -translate-x-1/2 rounded-full bg-black/90"
            aria-hidden
          />

          <span className="pointer-events-none absolute top-3 left-3 z-20 rounded-full bg-mint px-2 py-0.5 font-display text-[10px] font-bold tracking-wide text-ink">
            {String(index + 1).padStart(2, "0")}
          </span>

          {wipe !== null && (
            <div
              className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-mint"
              style={{ left: `${wipe * 100}%` }}
            >
              <span className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink font-display text-xs text-mint">
                ⇄
              </span>
            </div>
          )}
        </div>

        {canCompare ? (
          <div
            role="group"
            aria-label="Compare generic and on-pack"
            className="relative mt-2 grid grid-cols-2 rounded-full bg-canvas p-1"
          >
            <span
              className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full transition-all duration-200 ease-out ${
                genericActive ? "translate-x-0 bg-generic" : "translate-x-full bg-ink"
              }`}
              aria-hidden
            />
            <button
              type="button"
              aria-pressed={genericActive}
              onClick={() => select(true)}
              className={`relative z-10 py-2 font-display text-[11px] font-semibold tracking-wide uppercase ${
                genericActive ? "text-white" : "text-muted hover:text-ink"
              }`}
            >
              Generic
            </button>
            <button
              type="button"
              aria-pressed={!genericActive}
              onClick={() => select(false)}
              className={`relative z-10 py-2 font-display text-[11px] font-semibold tracking-wide uppercase ${
                !genericActive ? "text-mint" : "text-muted hover:text-ink"
              }`}
            >
              On-pack
            </button>
          </div>
        ) : (
          <p className="mt-2 rounded-full bg-ink py-2 text-center font-display text-[11px] font-semibold tracking-wide text-mint uppercase">
            On-pack
          </p>
        )}
      </div>

      <div className="space-y-2.5 px-1 pt-5">
        <h3 className="font-display text-xl leading-snug font-semibold tracking-tight">
          {concept.hook}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void shareOut()}
            disabled={shareState === "working"}
            className="rounded-full bg-ink px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide text-mint uppercase disabled:opacity-40"
          >
            {shareState === "working"
              ? "Preparing…"
              : shareState === "shared"
                ? "Opened share"
                : shareState === "copied"
                  ? "Caption copied"
                  : "Share"}
          </button>
          <button
            type="button"
            onClick={() => void downloadOut()}
            disabled={shareState === "working"}
            className="rounded-full border border-hairline bg-surface px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide text-muted uppercase hover:text-ink disabled:opacity-40"
          >
            {shareState === "saved" ? "Saved · caption copied" : "Download"}
          </button>
        </div>
        {review && (
          <p className="flex flex-wrap items-baseline gap-2 text-sm text-muted">
            <span className="italic text-ink/80">“{review.quote}”</span>
            <span className="rounded-full bg-lilac/60 px-2 py-0.5 font-mono text-[10px] tracking-widest text-ink uppercase">
              {review.theme}
            </span>
          </p>
        )}
        <p className="text-sm leading-relaxed text-muted">{concept.script}</p>
        <details>
          <summary className="cursor-pointer font-display text-[12px] font-semibold tracking-wide text-muted uppercase hover:text-ink">
            Shot list ({concept.shots.length})
          </summary>
          <ol className="mt-2 space-y-1.5 text-xs text-muted">
            {concept.shots.map((shot, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-display font-bold text-coral">{i + 1}.</span>
                <span>{shot}</span>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </article>
  );
}

async function videoFile(url: string, name: string): Promise<File | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new File([blob], name, { type: blob.type || "video/mp4" });
  } catch {
    return null;
  }
}

async function copyCaption(caption: string) {
  try {
    await navigator.clipboard.writeText(caption);
  } catch {
    /* clipboard can fail without a secure context */
  }
}

async function shareVideo(
  url: string,
  caption: string,
  name: string,
): Promise<"shared" | "copied"> {
  const file = await videoFile(url, name);
  if (
    file &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({ files: [file], text: caption, title: caption });
    return "shared";
  }
  if (typeof navigator.share === "function") {
    await navigator.share({ text: caption, url, title: caption });
    return "shared";
  }
  await copyCaption(caption);
  return "copied";
}

async function downloadVideo(url: string, caption: string, name: string) {
  const file = await videoFile(url, name);
  if (file) {
    const href = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  await copyCaption(caption);
}
