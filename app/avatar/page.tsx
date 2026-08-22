"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "../components/AppShell";
import { DEMO_URL } from "@/lib/stages/extract";
import type { AvatarRender, AvatarSpot } from "@/lib/stages/avatar";

type Phase = "idle" | "casting" | "rendering" | "ready";

/** "jasmine_vertical_walking" → "Jasmine · vertical · walking" */
function castLabel(avatarId: string): string {
  const [name, ...rest] = avatarId.split("_");
  return [name.charAt(0).toUpperCase() + name.slice(1), ...rest].join(" · ");
}

export default function AvatarPage() {
  const [url, setUrl] = useState(DEMO_URL);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [renderNote, setRenderNote] = useState<string | null>(null);
  const [spot, setSpot] = useState<AvatarSpot | null>(null);
  const [video, setVideo] = useState<AvatarRender | null>(null);

  const running = phase === "casting" || phase === "rendering";

  async function run() {
    setPhase("casting");
    setError(null);
    setRenderNote(null);
    setSpot(null);
    setVideo(null);
    try {
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as AvatarSpot & { error?: string };
      if (!res.ok) throw new Error(data.error || "avatar failed");
      setSpot(data);

      // Brief is on screen — now let VEED speak it. A render failure keeps
      // the brief; it never wipes the page.
      setPhase("rendering");
      try {
        const renderRes = await fetch("/api/avatar/render", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            avatarId: data.avatarId,
            vo: data.vo,
            scenePrompt: data.scenePrompt,
            voiceDescription: data.voiceDescription,
            productImage: data.productImage,
          }),
        });
        const rendered = (await renderRes.json()) as AvatarRender & {
          error?: string;
        };
        if (!renderRes.ok) throw new Error(rendered.error || "render failed");
        setVideo(rendered);
      } catch (err) {
        setRenderNote(
          `VEED render didn't land (${
            err instanceof Error ? err.message : String(err)
          }) — brief below still stands.`
        );
      }
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("idle");
    }
  }

  const status =
    phase === "casting"
      ? "Casting"
      : phase === "rendering"
        ? "VEED rendering"
        : "Ready";

  return (
    <AppShell status={status}>
      <header className="rise mb-10 max-w-3xl">
        <p className="mb-4 inline-flex rounded-full bg-ink px-3 py-1 font-display text-[11px] font-semibold tracking-wide text-mint uppercase">
          Avatar spots · VEED
        </p>
        <h1 className="font-display text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.04em] md:text-5xl">
          A spokesperson who looks like{" "}
          <span className="-rotate-1 inline-block rounded-[1.25rem] bg-lilac px-2 py-0.5">
            the brand
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
          Separate from the LoRA product films. We build a branded set from
          your real product photo — presenter holding the product, backdrop in
          your palette — then VEED Fabric makes them speak the VO, captions
          transcribed from the real voice track.
        </p>
      </header>

      <div className="flex flex-col gap-2 rounded-[28px] border border-hairline bg-surface p-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !running && run()}
          placeholder="https://your-product-page…"
          spellCheck={false}
          className="flex-1 rounded-2xl bg-canvas px-4 py-3.5 font-mono text-sm outline-none placeholder:text-muted/50"
        />
        <button
          onClick={run}
          disabled={running || !url}
          className="cta-pop rounded-2xl bg-coral px-8 py-3.5 font-display text-base font-bold text-white transition-transform disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
        >
          {phase === "casting"
            ? "Writing brief…"
            : phase === "rendering"
              ? "VEED speaking…"
              : "Cast avatar"}
        </button>
      </div>

      {error && (
        <p className="mt-6 font-display text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      {spot && (
        <div className="mt-12 grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="phone-lift mx-auto w-full max-w-[280px] rounded-[36px] border border-white bg-surface p-2.5">
            <div className="relative flex aspect-[9/16] flex-col justify-end overflow-hidden rounded-[28px] bg-ink p-5">
              <span className="absolute top-2.5 left-1/2 z-10 h-5 w-[72px] -translate-x-1/2 rounded-full bg-black/90" />
              <span className="absolute top-3 left-3 z-10 rounded-full bg-lilac px-2 py-0.5 font-display text-[10px] font-bold text-ink">
                VEED
              </span>

              {video ? (
                <>
                  <video
                    src={video.videoUrl}
                    className="absolute inset-0 h-full w-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                  />
                  {(video.cached || video.mock) && (
                    <span className="absolute top-3 right-3 z-10 rounded-full bg-black/70 px-2 py-0.5 font-display text-[10px] font-bold tracking-wide text-white/80 uppercase">
                      {video.mock ? "mock" : "cached"}
                    </span>
                  )}
                </>
              ) : phase === "rendering" ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                  <span className="h-10 w-10 animate-pulse rounded-full bg-lilac" />
                  <p className="font-display text-sm font-semibold text-white">
                    {castLabel(spot.avatarId)}
                  </p>
                  <p className="text-xs leading-relaxed text-white/60">
                    {spot.productImage
                      ? "VEED Fabric is building your branded set — product in hand — and making the presenter speak…"
                      : "VEED is rendering the spokesperson speaking your VO…"}
                  </p>
                </div>
              ) : (
                <>
                  <p className="font-display text-lg leading-snug font-semibold text-white">
                    {spot.brand}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-white/60">
                    {spot.avatarLook}
                  </p>
                </>
              )}
            </div>
            <p className="mt-2 rounded-full bg-canvas py-2 text-center font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
              {video ? "Avatar spot" : "Avatar brief"}
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-ink px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide text-mint uppercase">
                Cast: {castLabel(spot.avatarId)}
              </span>
              <span className="rounded-full bg-surface px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
                {video
                  ? video.engine === "fabric"
                    ? "veed/fabric-1.0 · branded set"
                    : video.engine === "stock"
                      ? "veed/avatars · stock set"
                      : "mock render"
                  : spot.productImage
                    ? "veed/fabric-1.0 · branded set"
                    : "veed/avatars · text-to-video"}
              </span>
            </div>

            {renderNote && (
              <p className="rounded-2xl border border-hairline bg-surface p-4 text-sm text-muted">
                {renderNote}
              </p>
            )}

            <Block label="Why this cast" body={spot.avatarLook} />
            <Block label="The set — branded frame, product in hand" body={spot.scenePrompt} />
            <Block label="Voice cast" body={spot.voiceDescription} />
            <Block label="Voiceover — spoken verbatim by the avatar" body={spot.vo} />
            <Block label="Director script" body={spot.script} />
            <Block label="Music bed" body={spot.musicBed} />
            <Block label="Captions" body={spot.captions} />
            <p className="text-sm text-muted">
              Rendered through VEED (host sponsor). Product films stay on{" "}
              <Link href="/forge" className="underline decoration-hairline hover:text-ink">
                Brand films
              </Link>
              .
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-hairline bg-surface p-5">
      <p className="font-display text-[11px] font-semibold tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className="mt-2 text-sm leading-relaxed">{body}</p>
    </div>
  );
}
