# AdForge

Paste a product URL. Get on-brand short-form video ads, written around what real
customers actually praise. Minutes, not weeks.

Built for the {Tech: Europe} × VEED Hackathon, London.

## Run it

```bash
npm install
cp .env.example .env.local   # optional — see below
npm run dev                  # http://localhost:3000
```

**It runs with no API keys at all.** Every stage checks for its key and falls
back to a `getMock*()` path when the key is absent, so a clean clone gives you
the full pipeline — streaming stage indicators, extracted facts, review hooks,
three ad cards, before/after toggle — against mock data. Add keys one at a time
to swap individual stages over to the real API; nothing else has to change.

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

## Demo product

Glow Recipe — Watermelon Glow Niacinamide Dew Drops. Picked for its distinct
pastel palette (strong LoRA signal) and 377+ reviews (rich hooks). Backups are
ranked in `demo-product-candidates.csv`.

## Stack

Next.js 15 (App Router), React 19, Tailwind CSS v4, TypeScript. No database, no
auth, no persistence beyond the LoRA id cache.
