# AdForge

Paste a product URL. Get on-brand short-form video ads, written around what real
customers actually praise. Minutes, not weeks.

Built for the {Tech: Europe} × VEED Hackathon, London.

## Run it

```bash
npm install
npm run dev   # runs `next dev` + `convex dev` together, http://localhost:3000
```

The first run creates `.env.local` for you (see below). To add partner API
keys, open `.env.example` for the list and add them to `.env.local` — don't
overwrite it, `convex dev` needs the deployment vars it writes there.

**It runs with no API keys and no Convex account at all.** Every pipeline
stage checks for its key and falls back to a `getMock*()` path when the key is
absent, so a clean clone gives you the full pipeline — streaming stage
indicators, extracted facts, review hooks, three ad cards, before/after
toggle — against mock data. Add partner keys one at a time to swap individual
stages over to the real API; nothing else has to change.

The first `npm run dev` (or `npx convex dev`) spins up a **local, anonymous
Convex deployment** automatically — no `npx convex login`, no browser OAuth,
no Convex account needed for the hackathon. It writes `CONVEX_DEPLOYMENT` and
`NEXT_PUBLIC_CONVEX_URL` into `.env.local` for you. To move to a real hosted
Convex project later, run `npx convex login` once.

## Pipeline

| Stage | Partner tech | What it does |
| --- | --- | --- |
| `extract` | Tavily Extract → GLiNER2 (Pioneer/Fastino) | Structured product fields + product image URLs from a live URL |
| `reviews` | Tavily Search | Real customer quotes, theme-clustered — the ad copy seed |
| `lora` | fal · `flux-lora-fast-training` | Brand LoRA trained on the product's own images |
| `concepts` | OpenAI | 3 ad concepts: hook, script, shot list — grounded in the facts + hooks |
| `render` | fal · `flux-lora` → Kling 2.5 Turbo Pro | On-brand keyframe, then image-to-video |

The orchestrator is a single route, `app/api/generate/route.ts`. It streams
newline-delimited JSON so the UI fills in progressively rather than sitting on a
spinner — stage indicators go green as each stage lands, and each ad card appears
the moment its video finishes.

LoRA training starts as soon as extraction yields image URLs and runs alongside
the review and concept stages. Trained LoRA ids are cached to `.lora-cache/`
keyed by a hash of the product URL, so warm runs skip training entirely.

## Layout

```
app/
  page.tsx                  single page — input, stage indicators, gallery
  components/
    PipelineSteps.tsx       five stage indicators, partner tech named on each
    AdCard.tsx              video + before/after toggle + script + shot list
  api/generate/route.ts     the orchestrator; streams NDJSON
lib/
  types.ts                  the interface contract + the streamed event union
  stages/
    extract.ts  reviews.ts  concepts.ts  lora.ts  render.ts
scripts/
  gen-mock-assets.mjs       regenerates the placeholder stills
public/mock/                mock videos and stills
```

Each file under `lib/stages/` exports a `getMock*()` and the real function, and
nothing outside that directory knows which one ran.

## Mock assets

The placeholder stills are regenerated with:

```bash
node scripts/gen-mock-assets.mjs
```

The placeholder videos are ffmpeg-generated 9:16 gradients:

```bash
ffmpeg -f lavfi -i "gradients=s=540x960:c0=0xff6b8a:c1=0xffd6df:x0=80:y0=120:x1=460:y1=840:d=8:speed=0.10" \
  -vf "vignette=PI/5,format=yuv420p" -t 6 -r 24 -c:v libx264 -preset veryfast \
  -crf 26 -pix_fmt yuv420p -movflags +faststart public/mock/ad-1.mp4
```

The "generic" stills are deliberately drab grey so the before/after toggle reads
at a glance before a real LoRA is wired in.

## Auth + saved runs (Convex)

Optional layer on top of the demo, not a gate in front of it — CLAUDE.md's "no
auth" rule holds for the URL → gallery flow itself; a judge never has to sign
in to see it work.

- **Backend:** Convex, running as a free local anonymous deployment (no
  account needed — see above). `convex/schema.ts` defines a `generations`
  table alongside Convex Auth's own user tables.
- **Auth:** `@convex-dev/auth`, two providers — `Anonymous` (the "Save my
  runs" button, top right, zero friction) and `Password` (real accounts).
  `middleware.ts` only refreshes the session cookie; it never redirects, so
  signed-out traffic is unaffected.
- **What gets saved:** after a run finishes, `app/page.tsx` calls the
  `generations.save` mutation with the raw NDJSON event log. Signed out, the
  mutation is a no-op (`convex/generations.ts`). Signed in, it's replayable
  history without re-calling any partner API.

## Demo product

Glow Recipe — Watermelon Glow Niacinamide Dew Drops. Picked for its distinct
pastel palette (strong LoRA signal) and 377+ reviews (rich hooks). Backups are
ranked in `demo-product-candidates.csv`.

## Stack

Next.js 15 (App Router), React 19, Tailwind CSS v4, TypeScript, Convex +
Convex Auth for the optional saved-runs layer.
