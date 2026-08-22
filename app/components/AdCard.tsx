"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { Concept, RenderResult, ReviewHook } from "@/lib/types";

/**
 * Comparison is the card. The bezel control is the 2-meter-away signal;
 * drag-wipe on the frame is the close-up. Generic is a still, Brand LoRA
 * is the video — labelled honestly as No LoRA vs Brand LoRA.
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

  return (
    <article
      className="rise"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="overflow-hidden rounded-[12px] border border-hairline bg-surface">
        <div
          ref={frameRef}
          className={`relative aspect-[9/16] bg-black ${
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
              alt="No LoRA — generic output"
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
                    wipe === null ? "transition-[clip-path] duration-[180ms]" : ""
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
          {wipe !== null && (
            <div
              className="pointer-events-none absolute inset-y-0 z-10 w-px bg-tungsten"
              style={{ left: `${wipe * 100}%` }}
            >
              <span className="absolute top-1/2 left-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-tungsten bg-canvas" />
            </div>
          )}
        </div>

        {canCompare ? (
          <div
            role="group"
            aria-label="Compare generic and brand LoRA"
            className="grid grid-cols-2 border-t border-hairline"
          >
            <button
              type="button"
              aria-pressed={genericActive}
              onClick={() => select(true)}
              className={`py-2.5 font-mono text-[11px] tracking-widest uppercase transition-colors duration-[180ms] ${
                genericActive
                  ? "bg-generic/25 text-fg"
                  : "text-muted hover:text-fg"
              }`}
            >
              No LoRA
            </button>
            <button
              type="button"
              aria-pressed={!genericActive}
              onClick={() => select(false)}
              className={`py-2.5 font-mono text-[11px] tracking-widest uppercase transition-colors duration-[180ms] ${
                !genericActive
                  ? "bg-tungsten text-canvas"
                  : "text-muted hover:text-fg"
              }`}
            >
              Brand LoRA
            </button>
          </div>
        ) : (
          <p className="border-t border-hairline py-2.5 text-center font-mono text-[11px] tracking-widest text-tungsten uppercase">
            Brand LoRA
          </p>
        )}
      </div>

      <div className="space-y-2.5 px-1 pt-4">
        <h3 className="font-serif text-xl leading-snug">{concept.hook}</h3>
        {review && (
          <p className="flex flex-wrap items-baseline gap-2 text-sm text-muted">
            <span className="font-serif italic text-fg/80">“{review.quote}”</span>
            <span className="rounded-[4px] border border-hairline px-1.5 py-0.5 font-mono text-[10px] tracking-widest uppercase">
              {review.theme}
            </span>
          </p>
        )}
        <p className="text-sm leading-relaxed text-muted">{concept.script}</p>
        <details>
          <summary className="cursor-pointer font-mono text-[11px] tracking-widest text-muted uppercase hover:text-fg">
            Shot list ({concept.shots.length})
          </summary>
          <ol className="mt-2 space-y-1.5 text-xs text-muted">
            {concept.shots.map((shot, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-mono text-tungsten">{i + 1}.</span>
                <span>{shot}</span>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </article>
  );
}
