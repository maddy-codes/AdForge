# AdForge — Team Role Division

**{Tech: Europe} × VEED Hackathon | Taran + Jatin**

## 1. Team Objective

Build AdForge:

**Product URL → customer research → creative strategy → brand-aware generation → finished short-form ads**

The division is designed around each teammate's strongest skills so the team moves quickly without duplicating work.

---

## 2. Team Structure

### Taran — Product / Creative / Frontend Lead

- Own the user experience, frontend, visual quality, product direction, demo flow and pitch.
- Make AdForge look and feel like a polished real product.
- Own the creative strategy and OpenAI creative-director layer.

### Jatin — AI / Data / Backend Lead

- Own AI/data infrastructure, extraction, research, backend orchestration and model evaluation.
- Make AdForge technically intelligent and reliable.
- Own Pioneer/GLiNER2 and Tavily research implementation.

---

# 3. Taran — Primary Responsibilities

## Frontend & UX

- Next.js + Tailwind application.
- URL input and campaign setup.
- Research/generation progress experience.
- Brand-analysis presentation.
- Final 3-ad gallery.
- Before/after generic-vs-LoRA comparison.
- Loading, error and fallback states.
- Overall visual polish.

## Product Architecture

- Define the end-to-end user journey.
- Keep the product focused on one spectacular happy path.
- Decide what the judge sees at every stage.
- Coordinate integration between backend outputs and frontend.

## OpenAI Creative Director

- Design prompts and structured outputs.
- Turn product facts + customer insights + brand information into ad concepts.
- Generate hook, script, shot list, visual direction and CTA.
- Ensure the three ads have genuinely different creative strategies.

## fal Creative Direction

- Select product assets.
- Define visual style.
- Evaluate generations for brand consistency.
- Choose strongest generations for the demo.
- Work with Jatin on fal/LoRA implementation.

## Demo & Pitch

- Own the 2-minute demo narrative.
- Own the 5-minute finalist presentation if selected.
- Make the product understandable within seconds.
- Lead README/product documentation while Jatin supplies technical sections.

---

# 4. Jatin — Primary Responsibilities

## Pioneer / GLiNER2

- Set up Pioneer.
- Define product-attribute extraction schema.
- Implement GLiNER2 extraction.
- Fine-tune/evaluate where practical.
- Benchmark against a general-purpose LLM call.
- Return structured product information.

## Tavily Research Engine

- Research reviews, mentions, competitors and customer discussions.
- Extract recurring customer pain points and positive themes.
- Produce structured customer hooks for ad concepts.
- Prioritize useful evidence and handle noisy results.

## Backend & Orchestration

- Build the API/orchestration layer.
- Connect extraction, research, creative generation and rendering.
- Define stable interfaces between pipeline stages.
- Handle API errors, retries and fallbacks.
- Keep secrets server-side.

## fal Technical Integration

- Implement fal API calls.
- Handle LoRA training/application where feasible.
- Connect generation outputs to backend.
- Cache reliable outputs for demo resilience.

## h Computer-Use Agent — Stretch

- Attempt only if the core pipeline is stable.
- Potential use: load generated creative into an ad manager.
- Never put this in the critical path if it risks the main demo.

## Technical Documentation

- Document APIs, models, architecture and setup.
- Explain Pioneer/GLiNER2 evaluation.
- Document fallback behaviour and limitations.

---

# 5. Responsibility Matrix

| Area | Taran | Jatin |
|---|---|---|
| Product vision | **LEAD** | Support |
| UI / UX | **LEAD** | — |
| Next.js / frontend | **LEAD** | Support |
| OpenAI creative director | **LEAD** | Support |
| Prompt engineering | **LEAD** | Support |
| fal visual direction | **LEAD** | Support |
| fal API / generation | Support | **LEAD** |
| LoRA training | Support | **LEAD** |
| Pioneer | — | **LEAD** |
| GLiNER2 | — | **LEAD** |
| Tavily | Support | **LEAD** |
| Backend | Support | **LEAD** |
| Data structures | Support | **LEAD** |
| Agent orchestration | Support | **LEAD** |
| h agent | — | **LEAD if time** |
| Demo UX | **LEAD** | Support |
| Pitch | **LEAD** | Support |
| README | **LEAD** | Technical sections |
| Submission | **LEAD** | Support |

---

# 6. Shared Responsibilities

- **Integration:** test the complete URL → ads pipeline together.
- **Quality control:** judge every output from a first-time judge's perspective.
- **Demo reliability:** maintain a cached hero video and fallback path.
- **Scope control:** cut features that threaten the core demo.
- **Creative selection:** choose final outputs together.
- **Submission:** verify GitHub, README, partner technologies and 2-minute demo.

---

# 7. Non-Negotiable Rules

- Taran does not spend hours on model fine-tuning while the frontend is unfinished.
- Jatin does not spend hours polishing UI while Pioneer/Tavily/backend work is incomplete.
- No feature is added unless it improves judging or satisfies a competition requirement.
- h never gets to break the critical path.
- One polished end-to-end flow is more valuable than five half-working features.

---

# 8. Core Pipeline Ownership

| Stage | Taran | Jatin |
|---|---|---|
| URL | **Owns** | Supports integration |
| Product extraction | Consumes result | **Pioneer / GLiNER2** |
| Customer research | Defines useful output | **Tavily pipeline** |
| Creative strategy | **OpenAI creative director** | Structured inputs |
| Brand generation | **Visual direction** | **fal / LoRA integration** |
| Video rendering | Presentation | **Backend generation** |
| Final gallery | **Owns** | API/output reliability |

---

# 9. Team Mantra

> **Jatin makes AdForge intelligent. Taran makes AdForge impressive.**

The winning demo needs both: a technically credible AI/data pipeline underneath and an exceptionally polished, visually obvious product experience on top.

---

# 10. Day-of-Hackathon Working Rule

- Work in parallel wherever possible.
- Mock API contracts before real implementations are finished.
- Integrate early rather than waiting for perfect components.
- At every checkpoint ask: **“Would a judge be impressed by this?”**
- If not, simplify or improve it.
- Freeze features before submission; use the final period for reliability, demo recording and submission.
