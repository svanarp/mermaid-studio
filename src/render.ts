import mermaid from "mermaid";
import { extractFrontmatter } from "./frontmatter";
import type { Settings } from "./types";

export interface RenderResult {
  svg: SVGSVGElement;
  theme: string;
  warnings: string[];
}

export interface RenderError {
  message: string;
}

let renderCounter = 0;

export function buildMermaidConfig(settings: Settings): Record<string, unknown> {
  return {
    startOnLoad: false,
    securityLevel: settings.securityLevel,
    theme: settings.theme,
    themeVariables: {
      fontSize: String(settings.fontSize),
    },
    flowchart: {
      direction: settings.direction,
    },
  };
}

export async function renderDiagram(
  code: string,
  settings: Settings,
  container: HTMLElement
): Promise<RenderResult> {
  const { config, code: cleaned } = extractFrontmatter(code);
  const id = `mermaid-${++renderCounter}`;

  const merged = { ...buildMermaidConfig(settings), ...config };
  mermaid.initialize(merged);

  const result = await mermaid.render(id, cleaned);
  container.innerHTML = result.svg;

  const svg = container.querySelector("svg");
  if (!svg) throw new Error("Rendered output contained no SVG element.");

  // Mermaid renders `width="100%"` with a viewBox, which shrink-fits the
  // diagram to its container instead of its natural size. Force explicit
  // pixel dimensions so preview zoom/pan and raster export use real size.
  normalizeSvgSize(svg);

  return { svg, theme: (merged.theme as string) || settings.theme, warnings: [] };
}

/** Canvas background that keeps diagram strokes readable for a mermaid theme. */
export function canvasColorForTheme(theme: string): string {
  return theme === "dark" ? "#1e2530" : "#ffffff";
}

function normalizeSvgSize(svg: SVGSVGElement): void {
  const vb = svg.viewBox.baseVal;
  if (!vb.width || !vb.height) return;
  svg.setAttribute("width", `${vb.width}px`);
  svg.setAttribute("height", `${vb.height}px`);
  svg.style.maxWidth = "none";
  svg.style.width = `${vb.width}px`;
  svg.style.height = `${vb.height}px`;
}

export function normalizeMermaidError(e: unknown): string {
  if (e instanceof Error) {
    const raw = e.message;
    // mermaid errors embed the diagram source; trim to a readable snippet
    const firstLine = raw.split("\n")[0];
    return firstLine || raw;
  }
  return String(e);
}