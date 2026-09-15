export type AppTextSize = "small" | "default" | "large" | "extraLarge";

export const textSizeOptions: { value: AppTextSize; translationKey: string; scale: number }[] = [
  { value: "small", translationKey: "textSizeSmall", scale: 0.92 },
  { value: "default", translationKey: "textSizeDefault", scale: 1 },
  { value: "large", translationKey: "textSizeLarge", scale: 1.12 },
  { value: "extraLarge", translationKey: "textSizeExtraLarge", scale: 1.22 }
];

export function normalizeTextSize(value?: string | null): AppTextSize {
  return textSizeOptions.some((option) => option.value === value) ? value as AppTextSize : "default";
}

export function scaleFont(size: number, scale: number) {
  return Math.round(size * scale);
}

export function scaleSpace(size: number, scale: number) {
  return Math.round(size * (0.82 + scale * 0.18));
}
