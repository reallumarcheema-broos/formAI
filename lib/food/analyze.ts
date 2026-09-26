import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { FoodAnalysis, FoodItem } from "./types";

/**
 * Estimates the calories and macros in a meal photo with Claude's vision API.
 *
 * Model: claude-opus-5 by default; override with FORMAI_FOOD_MODEL if you want
 * to trade accuracy for cost. Effort is "low": this is a perception +
 * lookup task, not deep reasoning, so higher effort mostly adds cost.
 */
const MODEL = process.env.FORMAI_FOOD_MODEL || "claude-opus-5";

const SYSTEM = `You estimate the nutrition of meals from photos for a fitness app used worldwide, with many users in South Asia.

Identify each distinct food or drink you can see and estimate the portion actually on the plate. Recognise regional dishes by name (for example biryani, pulao, daal, karahi, nihari, haleem, roti, naan, paratha, chana, samosa, pakora, chai, lassi) as well as international foods. Account for cooking oil, ghee, butter and sugar that are typical for the dish, since they carry many of the calories.

Give your single best estimate for each number rather than a range. Use "low" confidence when the portion or dish is unclear, and mention the main uncertainty in notes (one or two short sentences). If the photo does not show food or drink, set is_food to false and return an empty items list.`;

/** JSON schema the model's answer must follow (structured outputs). */
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_food", "items", "notes"],
  properties: {
    is_food: { type: "boolean" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "portion", "grams", "kcal", "protein_g", "carbs_g", "fat_g", "confidence"],
        properties: {
          name: { type: "string" },
          portion: { type: "string" },
          grams: { type: "number" },
          kcal: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
      },
    },
    notes: { type: "string" },
  },
} as const;

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

export class FoodDeclinedError extends Error {}

let client: Anthropic | null = null;

export function isFoodScanConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const clamp = (n: unknown, max: number) => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.min(max, Math.max(0, Math.round(v * 10) / 10));
};

/** Never trust model output blindly: coerce types and clamp to sane ranges. */
function sanitize(raw: unknown): FoodAnalysis {
  const r = (raw ?? {}) as { is_food?: unknown; items?: unknown; notes?: unknown };
  const items: FoodItem[] = Array.isArray(r.items)
    ? r.items.slice(0, 20).map((it) => {
        const i = (it ?? {}) as Record<string, unknown>;
        const confidence = i.confidence === "high" || i.confidence === "low" ? i.confidence : "medium";
        return {
          name: String(i.name ?? "Food").slice(0, 80),
          portion: String(i.portion ?? "").slice(0, 60),
          grams: clamp(i.grams, 5000),
          kcal: clamp(i.kcal, 5000),
          protein_g: clamp(i.protein_g, 500),
          carbs_g: clamp(i.carbs_g, 1000),
          fat_g: clamp(i.fat_g, 500),
          confidence,
        };
      })
    : [];
  return { isFood: r.is_food === true && items.length > 0, items, notes: String(r.notes ?? "").slice(0, 400) };
}

export async function analyzeFoodPhoto(base64: string, mediaType: ImageMediaType): Promise<FoodAnalysis> {
  client ??= new Anthropic();

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // If a safety classifier declines, retry server-side on Anthropic's recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Estimate the calories and macros in this meal." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new FoodDeclinedError("The model declined this image");
  if (response.stop_reason === "max_tokens") throw new Error("Food analysis was cut off");

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("No analysis returned");
  return sanitize(JSON.parse(text.text));
}
