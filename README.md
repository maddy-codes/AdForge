# AdForge

Paste a product URL. Get on-brand short-form video ads, written around what real
customers actually praise. Minutes, not weeks.

Built **from scratch** at the **{Tech: Europe} × VEED Hackathon, London** (no
prior codebase — Next.js starter boilerplate only).

---

## 📹 Demo video (2 minutes)

> **[▶ Watch the demo on Loom](https://www.loom.com/share/REPLACE_ME)**
> <!-- TODO before 19:00: record the 2-min Loom (solution explanation + live
>      walkthrough of key features), set it to PUBLIC, and replace this link. -->

The video covers: the problem, a live run of the full pipeline on a real
product URL, the before/after LoRA toggle, and the Intel + Avatar surfaces.

---

## What it does

Small e-commerce brands can't afford an agency to turn their product page into
video ads. AdForge automates the whole creative pipeline from a single URL:

1. **Understands the product** — crawls the live product page and extracts
   structured facts (name, price, features, materials, category, tone) plus
   the product's own photos.
2. **Listens to customers** — crawls live reviews and clusters real customer
   quotes into themes. These quotes seed the ad copy, so every ad leads with
   what buyers actually praise, not marketing guesswork.
3. **Learns the brand's look** — trains a LoRA image model on the product's
   own photos, so generated footage is *on-brand*, not generic stock-AI.
4. **Writes the ads** — an LLM "creative director" produces 3 distinct
   concepts (hook, script, shot list) grounded in the extracted facts and
   review quotes.
5. **Renders the videos** — each concept becomes a 9:16 short-form video:
   LoRA-styled keyframe → image-to-video → burned-in animated captions.

The signature visual is the **before/after toggle** on every ad card: the same
concept rendered generic vs. rendered through the brand LoRA.

Two further product surfaces reuse the same extraction backbone:

- **Intel** (`/intel`) — competitor ad intelligence. From the same URL it finds
  rivals in the category, surfaces their viral ads via live search, and
  reverse-engineers each one's *structure* (hook type, beat-by-beat skeleton,
  timings) into a formula you could shoot for *your* product. It never
  recreates their footage, talent, or lines.
- **Avatar** (`/avatar`) — VEED-powered talking-head spots. The LLM writes the
  spot (voiceover, director script, captions, music bed, voice cast); the real
  product photo is composited into a branded 9:16 set; the presenter then
  speaks the VO, with word-level animated subtitles burned in.

---

## Partner technologies (hackathon requirement: min. 3)

| Partner | Where it's used | Models / endpoints |
| --- | --- | --- |
| **fal** ⭐ | LoRA training, keyframe generation, image-to-video, image compositing, and all VEED models are run on fal | `fal-ai/flux-lora-fast-training`, `fal-ai/flux-lora`, `fal-ai/kling-video/v2.5-turbo/pro/image-to-video`, `fal-ai/nano-banana/edit` |
| **VEED** (host, via fal) ⭐ | Talking-head avatar spots and subtitle burn-in on every rendered ad | `veed/fabric-1.0/text`, `veed/avatars/text-to-video`, `veed/subtitles` |
| **Tavily** ⭐ | Live web data for both pipelines: Extract (product page text + image URLs), Search (customer reviews; competitor viral ads for Intel) | Tavily Extract + Tavily Search APIs |
| **Pioneer / Fastino** ⭐ | GLiNER2 fine-tuned entity extraction turns raw page text into structured product fields | GLiNER2 fine-tune + inference API |
| **OpenAI** | The "creative director": ad concepts, avatar spot scripts, Intel formula reverse-engineering (structured outputs via zod schemas) | Chat Completions with `zodResponseFormat` |
| **Convex** | Reactive backend: jobs, generations, brands, LoRA cache, asset library. Pipeline state lives in Convex, the UI is a live subscription | Convex database + functions |
| **Clerk** | Optional sign-in (Google / email) for saved run history; guests never need an account | `@clerk/nextjs`, Convex JWT integration |

⭐ = official hackathon partner. **Four** partner technologies used (requirement: three).

---

## Run it from a clean clone

```bash
git clone <this repo>
cd TechEuropexVeed
npm install
npm run dev   # runs `next dev` + `convex dev` together → http://localhost:3000
```

**It runs with no API keys and no accounts at all.** Every pipeline stage
checks for its key and falls back to a `getMock*()` path when the key is
absent, so a clean clone gives you the full experience — streaming stage
indicators, extracted facts, review hooks, three ad cards, before/after
toggle — against bundled mock data. Add partner keys one at a time to swap
individual stages over to the real API; nothing else changes.

The first `npm run dev` (or `npx convex dev`) spins up a **local, anonymous
Convex deployment** automatically — no `npx convex login`, no browser OAuth,
no Convex account needed. It writes `CONVEX_DEPLOYMENT` and
`NEXT_PUBLIC_CONVEX_URL` into `.env.local` for you. To move to a hosted Convex
project later, run `npx convex login` once.

### API keys (optional, per stage)

Copy keys into the `.env.local` that the first run creates — don't overwrite
it, `convex dev` needs the deployment vars it writes there. See `.env.example`
for the full annotated list:

| Variable | Unlocks |
| --- | --- |
| `TAVILY_API_KEY` | Real page extraction + live reviews + Intel competitor search |
| `PIONEER_API_KEY` | Real GLiNER2 structured field extraction |
| `FAL_KEY` | Real LoRA training, keyframes, video renders, VEED models |
| `OPENAI_API_KEY` | Real ad concepts / avatar scripts / Intel formulas |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` | Sign-in + saved run history (guest mode works without) |

All keys are **server-side only** — nothing is ever exposed to the client.

### Other commands

```bash
npm run build    # production build
npm run lint     # ESLint
node scripts/gen-mock-assets.mjs   # regenerate placeholder stills
```

---

## Architecture

### Pipeline (brand films — the main surface)

| Stage | Partner tech | What it does |
| --- | --- | --- |
| `extract` | Tavily Extract → GLiNER2 (Pioneer/Fastino) | Structured product fields + product image URLs from a live URL |
| `reviews` | Tavily Search | Real customer quotes, theme-clustered — the ad copy seed |
| `lora` | fal · `flux-lora-fast-training` | Brand LoRA trained on the product's own images |
| `concepts` | OpenAI | 3 ad concepts: hook, script, shot list — grounded in facts + hooks |
| `render` | fal · `flux-lora` → Kling 2.5 Turbo Pro → `veed/subtitles` | On-brand keyframe → image-to-video → animated captions |

The orchestrator is a single route, `app/api/generate/route.ts`. It creates a
Convex `jobs` row and returns its id immediately; the pipeline writes every
stage transition to Convex and the UI is a **reactive subscription** — stage
indicators go green as each stage lands, and each ad card appears the moment
its video finishes. Pipeline state survives refreshes and overlapping runs
because it lives in the database, not an in-flight HTTP stream.

**Concurrency:** LoRA training starts as soon as extraction yields image URLs
and runs alongside the review and concept stages. Trained LoRA ids are cached
(keyed by a hash of the product URL), so warm runs skip training entirely.

**Product identity lock:** generated videos are locked to the listed product
SKU — the real listing photo is composited into keyframes
(`lib/productIdentity.ts`, `lib/compositeFrame.ts`) so the ad shows *your*
product, not a hallucinated lookalike.

### Avatar surface (`/avatar`, `app/api/avatar`)

OpenAI writes the spot → `fal-ai/nano-banana/edit` composites the real product
photo into a branded 9:16 presenter frame → `veed/fabric-1.0/text` makes the
presenter speak the VO → `veed/subtitles` burns in word-level captions. If the
branded chain fails (or no product photo exists), it falls back to VEED's
stock avatar roster via `veed/avatars/text-to-video`.

### Intel surface (`/intel`, `app/api/intel`)

URL → rivals in the category (OpenAI) → each rival's "viral" ads via Tavily
(two angled queries per rival) → OpenAI reverse-engineers the *structure* into
a shootable formula for this product. Structure only — never their content.

### Data model (Convex, `convex/schema.ts`)

- `jobs` — one row per pipeline run; every stage transition is written here
- `generations` — finished ads, saved per signed-in user
- `brands` — extracted brand facts per product URL
- `loras` — LoRA cache keyed by product-URL hash
- `assets` — uploaded product photos / logos (asset library)

Anonymous runs simply have no `userId`; signing in only adds saved history.
Clerk JWTs are validated by Convex via `convex/auth.config.ts`.

---

## Repository layout

```
app/
  page.tsx                  landing — URL input, stage indicators, gallery
  forge/ intel/ avatar/     the three product surfaces
  runs/ assets/ onboarding/ saved history, asset library, first-run flow
  components/
    PipelineSteps.tsx       stage indicators, partner tech named on each
    AdCard.tsx              video + before/after toggle + script + shot list
  api/
    generate/route.ts       brand-film orchestrator
    avatar/                 VEED talking-head pipeline
    intel/                  competitor ad intelligence
convex/
  schema.ts                 jobs / generations / brands / loras / assets
  *.ts                      queries + mutations per table, auth config
lib/
  types.ts                  the interface contract between all stages
  stages/                   extract · reviews · concepts · lora · render · avatar · intel
                            (each exports getMock* AND the real function;
                             nothing outside this directory knows which ran)
  fal.ts openai.ts tavily.ts pioneer.ts   thin API clients
  productIdentity.ts compositeFrame.ts    SKU lock + keyframe compositing
scripts/gen-mock-assets.mjs               regenerates placeholder stills
public/mock/                              mock videos and stills
```

---

## Every API, framework & tool used

**Partner APIs** — fal (`@fal-ai/client`), VEED models on fal, Tavily
(Extract + Search, REST), Pioneer/Fastino (GLiNER2, REST), OpenAI (`openai`
SDK with zod structured outputs).

**Framework & platform** — Next.js 15 (App Router, server-side API routes),
React 19, TypeScript 5.9, Tailwind CSS v4, Convex 1.45 (reactive database +
backend functions), Clerk 7 (`@clerk/nextjs`) for optional auth.

**Libraries** — `zod` (schema validation + LLM structured output),
`jszip` (LoRA training image bundles), `concurrently` (dev runner).

**Tooling** — ESLint (`next lint`), ffmpeg (mock video generation only).

---

## Demo product

Glow Recipe — Watermelon Glow Niacinamide Dew Drops. Picked for its distinct
pastel palette (strong LoRA signal) and 377+ reviews (rich hooks). Backup
candidates are ranked in `demo-product-candidates.csv`.

## Mock assets

Placeholder stills: `node scripts/gen-mock-assets.mjs`. Placeholder videos are
ffmpeg-generated 9:16 gradients:

```bash
ffmpeg -f lavfi -i "gradients=s=540x960:c0=0xff6b8a:c1=0xffd6df:x0=80:y0=120:x1=460:y1=840:d=8:speed=0.10" \
  -vf "vignette=PI/5,format=yuv420p" -t 6 -r 24 -c:v libx264 -preset veryfast \
  -crf 26 -pix_fmt yuv420p -movflags +faststart public/mock/ad-1.mp4
```

The "generic" stills are deliberately drab grey so the before/after toggle
reads at a glance before a real LoRA is wired in.

---

## Team

<!-- TODO before submission: list team members (max 5). -->
| Name | Role |
| --- | --- |
| _add name_ | _role_ |

## Submission checklist

- [x] Public GitHub repository with full source code
- [x] All APIs, frameworks & tools documented (this README)
- [x] Setup steps from a clean clone (works with zero keys via mocks)
- [x] ≥3 partner technologies (fal ⭐, VEED ⭐, Tavily ⭐, Pioneer/Fastino ⭐)
- [x] Project created newly at this hackathon
- [ ] 2-minute public Loom demo recorded and linked above
- [ ] Team listed (max 5)
- [ ] Submitted by 19:00
