import type { Settings } from "./types";

export const THEME_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "neutral", label: "Neutral" },
  { value: "dark", label: "Dark" },
  { value: "forest", label: "Forest" },
  { value: "base", label: "Base" },
];

export const defaultSettings: Settings = {
  theme: "default",
  direction: "TB",
  fontSize: 16,
  securityLevel: "strict",
  pngScale: 2,
  appTheme: "light",
  bg: "#ffffff",
};

export function mergeSettings(partial: Partial<Settings>): Settings {
  return { ...defaultSettings, ...partial };
}
