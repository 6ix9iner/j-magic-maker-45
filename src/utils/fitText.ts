// Picks a Tailwind text-size class based on string length so that money
// values with an unusually large number of digits (e.g. ₦50,000,000,000.00)
// shrink to stay on one line instead of overflowing their container or
// getting clipped. `steps` must be ordered from largest/most-restrictive
// `max` down to Infinity as the final catch-all.
export interface FitTextStep {
  max: number;
  class: string;
}

export function pickFitClass(text: string, steps: FitTextStep[]): string {
  const len = text.length;
  const step = steps.find((s) => len <= s.max);
  return step ? step.class : steps[steps.length - 1].class;
}

// Shared step tables for the common money-display sizes used around the app.
// Thresholds are deliberately tight - verified against real narrow mobile
// tiles, where a bold/tracking-tight numeral fits far fewer characters per
// line than a naive average-char-width estimate suggests.
export const MONEY_FIT_STEPS_XL: FitTextStep[] = [
  { max: 8, class: "text-xl" },
  { max: 10, class: "text-lg" },
  { max: 13, class: "text-base" },
  { max: 17, class: "text-sm" },
  { max: 22, class: "text-xs" },
  { max: Infinity, class: "text-[10px]" },
];

export const MONEY_FIT_STEPS_LG: FitTextStep[] = [
  { max: 8, class: "text-lg" },
  { max: 11, class: "text-base" },
  { max: 15, class: "text-sm" },
  { max: 20, class: "text-xs" },
  { max: Infinity, class: "text-[10px]" },
];

export const MONEY_FIT_STEPS_BASE: FitTextStep[] = [
  { max: 9, class: "text-base" },
  { max: 13, class: "text-sm" },
  { max: 18, class: "text-xs" },
  { max: Infinity, class: "text-[10px]" },
];

export const MONEY_FIT_STEPS_SM: FitTextStep[] = [
  { max: 10, class: "text-sm" },
  { max: 15, class: "text-xs" },
  { max: Infinity, class: "text-[10px]" },
];
