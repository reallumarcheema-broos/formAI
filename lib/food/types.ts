/** One food item recognised in a photo. Shared by the API route and the UI. */
export interface FoodItem {
  name: string;
  /** Human-readable portion, e.g. "1 plate", "2 rotis". */
  portion: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "high" | "medium" | "low";
}

export interface FoodAnalysis {
  isFood: boolean;
  items: FoodItem[];
  /** Short caveats from the model, e.g. "Oil content is hard to judge from a photo." */
  notes: string;
}

/** Errors the API route returns, so the UI can show a helpful message. */
export type FoodApiError =
  | "not-configured"
  | "not-subscribed"
  | "rate-limited"
  | "bad-image"
  | "declined"
  | "failed";
