export type ThemeColorId =
  | "violet"
  | "blue"
  | "green"
  | "rose"
  | "orange"
  | "neutral";

export interface ThemeColorPreset {
  id: ThemeColorId;
  label: string;
  /** OKLCH value of the light-mode primary token, used as a preview swatch. */
  swatch: string;
}

export const THEME_COLOR_PRESETS: ThemeColorPreset[] = [
  { id: "violet", label: "Violet", swatch: "oklch(0.596 0.205 275)" },
  { id: "blue", label: "Blue", swatch: "oklch(0.58 0.19 250)" },
  { id: "green", label: "Green", swatch: "oklch(0.56 0.15 145)" },
  { id: "rose", label: "Rose", swatch: "oklch(0.6 0.21 15)" },
  { id: "orange", label: "Orange", swatch: "oklch(0.68 0.19 55)" },
  { id: "neutral", label: "Neutral", swatch: "oklch(0.32 0.01 270)" },
];

export const DEFAULT_THEME_COLOR: ThemeColorId = "violet";
export const THEME_COLOR_STORAGE_KEY = "theme-color";
export const THEME_COLOR_ATTRIBUTE = "data-theme-color";

const THEME_COLOR_IDS = new Set<string>(
  THEME_COLOR_PRESETS.map((preset) => preset.id)
);

export function isThemeColorId(value: unknown): value is ThemeColorId {
  return typeof value === "string" && THEME_COLOR_IDS.has(value);
}
