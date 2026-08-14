export interface Settings {
  theme: string;
  direction: "TB" | "TD" | "LR" | "RL" | "BT";
  fontSize: number;
  securityLevel: string;
  pngScale: number;
  appTheme: "light" | "dark";
  bg: string;
}

export interface Tab {
  id: string;
  name: string;
  code: string;
}

export interface AppState {
  tabs: Tab[];
  activeId: string;
  settings: Settings;
}
