import { defaultSettings } from "./config";
import type { AppState, Tab } from "./types";

const KEY = "mermaid-studio.v1";

export function newId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

export function makeTab(name: string, code: string): Tab {
  return { id: newId(), name, code };
}

function defaultState(): AppState {
  const tab = makeTab("Diagram 1", DEFAULT_DIAGRAM);
  return { tabs: [tab], activeId: tab.id, settings: defaultSettings };
}

export const DEFAULT_DIAGRAM = `graph TD
  A[Start] --> B{Ready?}
  B -->|yes| C[Render]
  B -->|no| D[Fix code]
  C --> E((Done))
  D --> A`;

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private mode / quota)
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (!parsed.tabs?.length) return defaultState();
    const tabs = parsed.tabs.map((t) => ({
      id: t.id ?? newId(),
      name: t.name || "Diagram",
      code: t.code ?? "",
    }));
    const activeId = tabs.some((t) => t.id === parsed.activeId)
      ? parsed.activeId!
      : tabs[0].id;
    return {
      tabs,
      activeId,
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return defaultState();
  }
}