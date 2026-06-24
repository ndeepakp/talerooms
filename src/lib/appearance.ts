// Shared appearance options, used by the settings form, the settings API, and
// the root layout. Keeping the allowed values in one place means the UI and the
// validation can never drift apart.

export type ThemeMode = "light" | "dark" | "system";
export type AccentColor = (typeof ACCENTS)[number]["id"];
export type BackgroundPreset = (typeof BACKGROUNDS)[number]["id"];
export type ShelfStyle = (typeof SHELF_STYLES)[number]["id"];

export type Appearance = {
  themeMode: ThemeMode;
  accent: AccentColor;
  background: BackgroundPreset;
  // The finish of the Library bookshelf (the wooden plank look).
  shelf: ShelfStyle;
  // URL path of an uploaded image used as the feed-page wallpaper, or null.
  feedWallpaper: string | null;
};

export const THEME_MODES: { id: ThemeMode; label: string; hint: string }[] = [
  { id: "light", label: "Light", hint: "Always light" },
  { id: "dark", label: "Dark", hint: "Always dark" },
  { id: "system", label: "System", hint: "Follow my device" },
];

// `swatch` is just for the settings UI preview. The real colours live in CSS
// (globals.css) keyed by the `id` via [data-accent="..."].
export const ACCENTS = [
  { id: "graphite", label: "Graphite", swatch: "#18181b" },
  { id: "indigo", label: "Indigo", swatch: "#6366f1" },
  { id: "violet", label: "Violet", swatch: "#8b5cf6" },
  { id: "sky", label: "Sky", swatch: "#0ea5e9" },
  { id: "emerald", label: "Emerald", swatch: "#10b981" },
  { id: "amber", label: "Amber", swatch: "#f59e0b" },
  { id: "rose", label: "Rose", swatch: "#f43f5e" },
] as const;

export const BACKGROUNDS = [
  { id: "plain", label: "Plain", swatch: "#fafafa" },
  { id: "paper", label: "Warm paper", swatch: "#f5f0e6" },
  { id: "slate", label: "Cool grey", swatch: "#eef1f5" },
] as const;

// `swatch` previews the plank colour in the settings UI; the real shelf look
// lives in CSS (globals.css) keyed by the `id` via [data-shelf="..."].
export const SHELF_STYLES = [
  { id: "walnut", label: "Walnut", swatch: "#a07b3f" },
  { id: "oak", label: "Oak", swatch: "#cda86e" },
  { id: "ebony", label: "Ebony", swatch: "#3a332d" },
  { id: "minimal", label: "Minimal", swatch: "#d6d3cc" },
] as const;

export const DEFAULT_APPEARANCE: Appearance = {
  themeMode: "light",
  accent: "graphite",
  background: "plain",
  shelf: "walnut",
  feedWallpaper: null,
};

export function isThemeMode(v: unknown): v is ThemeMode {
  return THEME_MODES.some((t) => t.id === v);
}
export function isAccent(v: unknown): v is AccentColor {
  return ACCENTS.some((a) => a.id === v);
}
export function isBackground(v: unknown): v is BackgroundPreset {
  return BACKGROUNDS.some((b) => b.id === v);
}
export function isShelf(v: unknown): v is ShelfStyle {
  return SHELF_STYLES.some((s) => s.id === v);
}
