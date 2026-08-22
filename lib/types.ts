/**
 * The interface contract. All four stages are independent — each one has a
 * getMock* path so no stage is ever blocked on another stage's real API.
 * See DECISIONS.md D2 (imageUrls) and D6 (render is two-stage internally).
 */

export type ProductFacts = {
  name: string;
  price: string;
  features: string[];
  materials: string[];
  category: string;
  tone: string;
  /** D2: Tavily Extract returns these; they feed fal LoRA training. */
  imageUrls: string[];
};

export type ReviewHook = {
  quote: string;
  theme: string;
};

export type Reviews = {
  hooks: ReviewHook[];
};

export type Concept = {
  hook: string;
  script: string;
  shots: string[];
};

export type RenderResult = {
  videoUrl: string;
  /** Keyframe the video was animated from — powers the before/after toggle. */
  keyframeUrl?: string;
  /** Same keyframe generated WITHOUT the brand LoRA. The "before". */
  genericKeyframeUrl?: string;
};

export type Stage = "extract" | "reviews" | "concepts" | "lora" | "render";

export type StageStatus = "pending" | "running" | "done" | "failed" | "skipped";
