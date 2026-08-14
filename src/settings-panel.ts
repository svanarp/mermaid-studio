import { THEME_OPTIONS } from "./config";
import type { Store } from "./state";
import type { AppState } from "./types";

export function initSettingsPanel(
  panel: HTMLElement,
  store: Store<AppState>,
  onChange?: () => void
): void {
  const theme = document.getElementById("set-theme") as HTMLSelectElement;
  const direction = document.getElementById("set-direction") as HTMLSelectElement;
  const fontSize = document.getElementById("set-fontsize") as HTMLInputElement;
  const security = document.getElementById("set-security") as HTMLSelectElement;
  const scale = document.getElementById("set-scale") as HTMLSelectElement;
  const bg = document.getElementById("set-bg") as HTMLInputElement;

  THEME_OPTIONS.forEach((t) => {
    const o = document.createElement("option");
    o.value = t.value;
    o.textContent = t.label;
    theme.appendChild(o);
  });

  function applyFromState(): void {
    const s = store.get().settings;
    theme.value = s.theme;
    direction.value = s.direction;
    fontSize.value = String(s.fontSize);
    security.value = s.securityLevel;
    scale.value = String(s.pngScale);
    bg.value = s.bg;
  }

  function wire<T extends HTMLSelectElement | HTMLInputElement>(
    el: T,
    get: (el: T) => string | number
  ): void {
    el.addEventListener("change", () => {
      const val = get(el);
      store.update((st) => {
        if (el === theme) st.settings.theme = String(val);
        else if (el === direction) st.settings.direction = val as AppState["settings"]["direction"];
        else if (el === fontSize) st.settings.fontSize = Number(val);
        else if (el === security) st.settings.securityLevel = String(val);
        else if (el === scale) st.settings.pngScale = Number(val);
        else if (el === bg) st.settings.bg = String(val);
      });
      onChange?.();
    });
  }

  wire(theme, (e) => e.value);
  wire(direction, (e) => e.value);
  wire(fontSize, (e) => e.value);
  wire(security, (e) => e.value);
  wire(scale, (e) => e.value);
  wire(bg, (e) => e.value);

  store.subscribe(applyFromState);
  applyFromState();
}