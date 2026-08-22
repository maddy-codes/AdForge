# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: AdForge

URL in → on-brand short-form video ads out, in under a minute. Built for the {Tech: Europe} × VEED Hackathon (London). One product, one run, no auth, no persistence.

## Stack

- **Frontend:** Next.js + Tailwind, single page (`/`)
- **Backend:** Next.js API route — one orchestrator (`/api/generate`) chaining all partner calls
- **Partner APIs:** fal (LoRA train + video gen), Pioneer/Fastino (GLiNER2 fine-tune), Tavily (review crawl), OpenAI (creative director)

## Key API keys (set in `.env.local`, never commit)

```
OPENAI_API_KEY=
FAL_KEY=
TAVILY_API_KEY=
PIONEER_API_KEY=
```

## Interface contract

All four stages have independent types; mock each with hardcoded JSON before wiring the real API:

```ts
extract(url: string): Promise<{ name, price, features: string[], materials: string[], category, tone }>
reviews(urlOrName: string): Promise<{ hooks: { quote: string, theme: string }[] }>
concepts(facts, hooks): Promise<{ hook: string, script: string, shots: string[] }[]>
render(shots: string[], loraId: string): Promise<{ videoUrl: string }>
```

Return 3–4 concepts; `render` is called once per concept.

## Pipeline (orchestrator order)

1. `extract` — GLiNER2 fine-tuned model via Pioneer/Fastino pulls structured product fields from the URL
2. `reviews` — Tavily crawls live reviews; top hooks are the ad copy seed
3. `concepts` — OpenAI writes 3–4 ad concepts (hook + script + shot list) grounded in extracted facts + review hooks
4. `render` — fal generates short-form video per concept, applying the brand LoRA

## fal LoRA

Train on product images at startup (long pole — start first). Cache the `loraId` to disk so warm runs skip training. If the LoRA isn't ready by the demo, fall back to style-prompting with reference images — do NOT block the pipeline on it.

## UI shape

Single page: URL input at top, loading pipeline-step indicators in the middle, video gallery (3–4 cards) at the bottom. "Before/after" toggle per card showing generic vs LoRA output is the key differentiator visual — prioritise this over any other UI embellishment.

## Critical constraints

- **One demo product.** Pre-download its images. Pre-generate (and cache) the hero video to disk as a fallback before the demo.
- **Feature freeze 17:30.** No new work after that — submission and rehearsal only.
- **Server-side only.** Never expose API keys to the client.
- **Mock from minute one.** Every function must have a `getMock*()` path so no team member is ever blocked on another's API being ready.

## Development commands

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run lint     # ESLint
```

## Submission checklist

- Confirm fal and Pioneer usage are called out explicitly in the submission form (both have side challenges).
- README must list every API/framework and include setup steps from a clean clone.
- Tavily promo code: `AugustLondon` (8k top-up). fal promo: `techeuropexfal-london`.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
