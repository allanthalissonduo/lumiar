/**
 * Single source of truth for the color-theme catalog.
 *
 * The CSS variables themselves live in `src/app/globals.css` under
 * `html[data-theme="..."]` blocks. This module only carries the metadata
 * the UI (settings picker, no-flash boot script) needs.
 *
 * Adding a new theme is a two-step change:
 *   1. Append the new `html[data-theme="<id>"]` block in globals.css.
 *   2. Add an entry below.
 */

export const THEME_IDS = [
  "cobalt",
  "violet",
  "emerald",
  "amber",
  "rose",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "cobalt";

export const STORAGE_KEY = "lumiar.theme";

export const MODES = ["light", "dark"] as const;

export type Mode = (typeof MODES)[number];

export const DEFAULT_MODE: Mode = "dark";

export const MODE_STORAGE_KEY = "lumiar.mode";

export function isMode(value: unknown): value is Mode {
  return (
    typeof value === "string" && (MODES as ReadonlyArray<string>).includes(value)
  );
}

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  swatch: string;
}

export const THEMES: ReadonlyArray<ThemeMeta> = [
  {
    id: "cobalt",
    name: "Cobalt",
    tagline: "Eiaye — Royal Blue working, Electric Cobalt igniting.",
    swatch: "#2B6FDB",
  },
  {
    id: "violet",
    name: "Violet",
    tagline: "Confident, slightly playful.",
    swatch: "oklch(0.526 0.247 293)",
  },
  {
    id: "emerald",
    name: "Emerald",
    tagline: "Growth-coded — nods at messaging without copying WhatsApp green.",
    swatch: "oklch(0.62 0.16 162)",
  },
  {
    id: "amber",
    name: "Amber",
    tagline: "Warm and friendly — feels good for SMB teams.",
    swatch: "oklch(0.745 0.16 65)",
  },
  {
    id: "rose",
    name: "Rose",
    tagline: "Bold and modern — D2C, creator-economy, lifestyle.",
    swatch: "oklch(0.645 0.22 16)",
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    (THEME_IDS as ReadonlyArray<string>).includes(value)
  );
}
