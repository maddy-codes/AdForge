"use client";

import { useState } from "react";
import type { Concept, RenderResult } from "@/lib/types";

/**
 * The before/after toggle is the differentiator visual (CLAUDE.md, PRD §5) —
 * generic output vs brand-LoRA output on the same prompt. Prioritised over any
 * other embellishment.
 */
export default function AdCard({
  index,
  concept,
  result,
}: {
  index: number;
  concept: Concept;
  result: RenderResult;
}) {
  const [showGeneric, setShowGeneric] = useState(false);
  const canCompare = Boolean(result.genericKeyframeUrl && result.keyframeUrl);

  return (
    <article
      className="rise overflow-hidden rounded-2xl border border-white/10 bg-ink-soft"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="relative aspect-[9/16] bg-black">
        {showGeneric && canCompare ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.genericKeyframeUrl}
            alt="Generic output, no brand LoRA"
            className="h-full w-full object-cover"
          />
        ) : (
          <video
            src={result.videoUrl}
            poster={result.keyframeUrl}
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        )}

        {canCompare && (
          <button
            onClick={() => setShowGeneric((v) => !v)}
            className="absolute right-3 bottom-3 rounded-full border border-white/20 bg-black/65 px-3 py-1.5 text-xs font-medium backdrop-blur transition-colors hover:bg-black/85"
          >
            {showGeneric ? "Show brand LoRA" : "Show generic"}
          </button>
        )}

        <span
          className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase ${
            showGeneric
              ? "bg-white/15 text-white/70"
              : "bg-melon text-black"
          }`}
        >
          {showGeneric ? "Generic" : "Brand LoRA"}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <h3 className="text-base leading-snug font-semibold">{concept.hook}</h3>
        <p className="text-sm leading-relaxed text-white/55">
          {concept.script}
        </p>
        <details className="group">
          <summary className="cursor-pointer list-none text-xs text-white/40 hover:text-white/70">
            Shot list ({concept.shots.length}) ▾
          </summary>
          <ol className="mt-2 space-y-1.5 text-xs text-white/50">
            {concept.shots.map((shot, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-melon/70">{i + 1}.</span>
                <span>{shot}</span>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </article>
  );
}
