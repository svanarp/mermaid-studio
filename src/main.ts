import { createStore } from "./state";
import { loadState, saveState } from "./storage";
import type { AppState } from "./types";
import { initEditor } from "./editor";
import { initTabs, type TabApi } from "./tabs";
import { renderDiagram, normalizeMermaidError, canvasColorForTheme } from "./render";
import { initPreview, type Preview } from "./preview";
import { initSettingsPanel } from "./settings-panel";
import { TEMPLATES } from "./templates";
import { downloadBlob, withExtension } from "./export/filename";
import { svgToBlob } from "./export/svg";
import { svgToPngBlob, copyPngToClipboard } from "./export/png";
import { svgToHtml } from "./export/html";

const store = createStore<AppState>(loadState());

const editorEl = document.getElementById("code-input") as HTMLTextAreaElement;
const layerEl = document.getElementById("code-layer") as HTMLPreElement;
const tabsEl = document.getElementById("tabs") as HTMLDivElement;
const viewportEl = document.getElementById("viewport") as HTMLDivElement;
const stageEl = document.getElementById("stage") as HTMLDivElement;
const statusEl = document.getElementById("status-text") as HTMLSpanElement;
const statusBar = document.getElementById("statusbar") as HTMLElement;
const renderStatusEl = document.getElementById("render-status") as HTMLSpanElement;
const divider = document.getElementById("divider") as HTMLDivElement;
const editorPane = document.getElementById("editor") as HTMLElement;
const previewPane = document.getElementById("preview") as HTMLElement;

const preview = initPreview(viewportEl, stageEl);

let debounceTimer: number | undefined;
let renderSeq = 0;
let lastTheme: string | undefined;

function activeCode(): string {
  const s = store.get();
  const t = s.tabs.find((x) => x.id === s.activeId);
  return t?.code ?? "";
}

function setActiveCode(code: string): void {
  store.update((s) => {
    const t = s.tabs.find((x) => x.id === s.activeId);
    if (t) t.code = code;
  });
}

function setStatus(msg: string, kind: "" | "error" | "ok" = ""): void {
  statusEl.textContent = msg;
  statusBar.className = kind;
}

function scheduleRender(): void {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => void doRender(), 300);
}

async function doRender(): Promise<void> {
  const seq = ++renderSeq;
  const code = activeCode();
  const settings = store.get().settings;
  renderStatusEl.textContent = "Rendering\u2026";
  renderStatusEl.className = "muted";
  try {
    const { svg, theme } = await renderDiagram(code, settings, stageEl);
    if (seq !== renderSeq) return; // stale
    lastTheme = theme;
    preview.setSvg(svg);
    viewportEl.style.background = canvasColorForTheme(theme);
    renderStatusEl.textContent = "OK";
    renderStatusEl.className = "ok";
    setStatus("Rendered", "ok");
  } catch (e) {
    if (seq !== renderSeq) return;
    preview.clear();
    const msg = normalizeMermaidError(e);
    renderStatusEl.textContent = "Error";
    renderStatusEl.className = "error";
    setStatus(msg, "error");
  }
}

const editor = initEditor(editorEl, layerEl, () => {
  setActiveCode(editor.getValue());
  scheduleRender();
});

function selectTab(id: string): void {
  store.update((s) => {
    s.activeId = id;
  });
  editor.setValue(activeCode());
  void doRender();
}

const tabApi: TabApi = initTabs(tabsEl, store, {
  onSelect: selectTab,
});

function activeTabName(): string {
  const s = store.get();
  return s.tabs.find((x) => x.id === s.activeId)?.name ?? "diagram";
}

// initialize with active tab's code
editor.setValue(activeCode());
void doRender();

/* ---------------- settings panel ---------------- */
const settingsPanel = document.getElementById("settings-panel") as HTMLElement;
initSettingsPanel(settingsPanel, store, () => scheduleRender());
document.getElementById("btn-settings")!.addEventListener("click", () => {
  settingsPanel.classList.toggle("hidden");
});
document.getElementById("btn-settings-close")!.addEventListener("click", () => {
  settingsPanel.classList.add("hidden");
});

/* ---------------- templates panel ---------------- */
const templatesPanel = document.getElementById("templates-panel") as HTMLElement;
const title = document.createElement("div");
title.className = "panel-title";
title.textContent = "Templates";
templatesPanel.appendChild(title);
TEMPLATES.forEach((t) => {
  const btn = document.createElement("button");
  btn.className = "template";
  btn.innerHTML = `<strong>${t.name}</strong><small>${t.type}</small>`;
  btn.addEventListener("click", () => {
    tabApi.addTab();
    setActiveCode(t.code);
    editor.setValue(t.code);
    templatesPanel.classList.add("hidden");
    void doRender();
  });
  templatesPanel.appendChild(btn);
});
document.getElementById("btn-templates")!.addEventListener("click", () => {
  templatesPanel.classList.toggle("hidden");
});

/* ---------------- theme toggle ---------------- */
function applyTheme(appTheme: "light" | "dark"): void {
  document.documentElement.dataset.theme = appTheme;
}
document.getElementById("btn-theme")!.addEventListener("click", () => {
  store.update((s) => {
    s.settings.appTheme = s.settings.appTheme === "dark" ? "light" : "dark";
    applyTheme(s.settings.appTheme);
  });
});
applyTheme(store.get().settings.appTheme);

/* ---------------- export ---------------- */
function currentSvg(): SVGSVGElement | null {
  return stageEl.querySelector("svg");
}

document.getElementById("btn-export-svg")!.addEventListener("click", () => {
  const svg = currentSvg();
  if (!svg) return setStatus("Nothing to export \u2014 render first", "error");
  const name = activeTabName();
  downloadBlob(svgToBlob(svg), withExtension(name, "svg"));
  setStatus("SVG exported", "ok");
});

document.getElementById("btn-export-png")!.addEventListener("click", async () => {
  const svg = currentSvg();
  if (!svg) return setStatus("Nothing to export \u2014 render first", "error");
  const { pngScale, bg } = store.get().settings;
  const blob = await svgToPngBlob(svg, { scale: pngScale, background: bg });
  downloadBlob(blob, withExtension(activeTabName(), "png"));
  setStatus(`PNG exported (${pngScale}x)`, "ok");
});

document.getElementById("btn-copy-png")!.addEventListener("click", async () => {
  const svg = currentSvg();
  if (!svg) return setStatus("Nothing to export \u2014 render first", "error");
  try {
    await copyPngToClipboard(svg);
    setStatus("PNG copied to clipboard", "ok");
  } catch {
    setStatus("Clipboard write failed (permissions?)", "error");
  }
});

document.getElementById("btn-export-html")!.addEventListener("click", async () => {
  const svg = currentSvg();
  if (!svg) return setStatus("Nothing to export \u2014 render first", "error");
  const theme = lastTheme ?? "default";
  const blob = await svgToHtml(svg, { canvas: canvasColorForTheme(theme) });
  downloadBlob(blob, withExtension(activeTabName(), "html"));
  setStatus("HTML exported", "ok");
});

/* ---------------- share via URL ---------------- */
document.getElementById("btn-share")!.addEventListener("click", () => {
  const code = activeCode();
  const hash = "#m=" + btoa(unescape(encodeURIComponent(code)));
  history.replaceState(null, "", hash);
  const url = location.href;
  navigator.clipboard?.writeText(url).catch(() => undefined);
  setStatus("Share link copied to clipboard", "ok");
});

function applyHash(): void {
  const m = location.hash.match(/^#m=(.+)$/);
  if (!m) return;
  try {
    const code = decodeURIComponent(escape(atob(m[1])));
    setActiveCode(code);
    editor.setValue(code);
    void doRender();
    setStatus("Loaded diagram from URL", "ok");
  } catch {
    setStatus("Invalid share link", "error");
  }
}

/* ---------------- split divider ---------------- */
function initDivider(): void {
  let dragging = false;
  divider.addEventListener("mousedown", (e) => {
    dragging = true;
    divider.classList.add("dragging");
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const total = editorPane.offsetWidth + previewPane.offsetWidth + divider.offsetWidth;
    const pct = Math.min(0.8, Math.max(0.2, e.clientX / total)) * 100;
    editorPane.style.flex = `0 0 ${pct}%`;
    previewPane.style.flex = `0 0 ${100 - pct}%`;
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
    divider.classList.remove("dragging");
  });
}
initDivider();

/* ---------------- zoom controls ---------------- */
document.querySelectorAll<HTMLButtonElement>("[data-zoom]").forEach((b) => {
  b.addEventListener("click", () => {
    const v = b.dataset.zoom!;
    if (v === "in") preview.zoom(1.25);
    else if (v === "out") preview.zoom(0.8);
    else if (v === "fit") preview.fit();
    else if (v === "100") preview.reset();
  });
});

/* ---------------- keyboard shortcuts ---------------- */
window.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  const k = e.key.toLowerCase();
  if (k === "s") {
    e.preventDefault();
    if (e.shiftKey) document.getElementById("btn-export-png")!.click();
    else document.getElementById("btn-export-svg")!.click();
  } else if (k === "h") {
    e.preventDefault();
    document.getElementById("btn-export-html")!.click();
  } else if (k === "n") {
    e.preventDefault();
    tabApi.addTab();
  } else if (k === "w") {
    e.preventDefault();
    tabApi.closeCurrent();
  } else if (k === "e") {
    e.preventDefault();
    editor.focus();
  }
});

/* ---------------- persistence ---------------- */
store.subscribe(() => saveState(store.get()));

applyHash();