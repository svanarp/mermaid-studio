import { svgToStandaloneString } from "./svg";

export interface HtmlExportOptions {
  canvas: string; // background color of the page canvas
}

/**
 * Builds a fully standalone HTML page embedding the diagram SVG, with an
 * in-page toolbar (zoom in/out, fit, 1:1) and drag-to-pan with a hand cursor.
 * No browser scrolling is used; the canvas moves freely in any direction.
 */
export async function svgToHtml(
  svg: SVGSVGElement,
  opts: HtmlExportOptions
): Promise<Blob> {
  let svgMarkup = await svgToStandaloneString(svg);
  // Safety: never propagate live script markup into the exported page.
  svgMarkup = svgMarkup.replace(/<script[\s\S]*?<\/script>/gi, "");

  const title = escapeHtml(
    document.title.replace(/[\\/:*?"<>|]/g, "-").trim() || "diagram"
  );

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; overflow: hidden; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: ${opts.canvas};
  }
  #toolbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 10;
    display: flex; align-items: center; gap: 6px;
    padding: 8px 12px;
    background: rgba(28, 30, 34, 0.92);
    color: #eee; border-bottom: 1px solid rgba(255,255,255,0.12);
  }
  #toolbar button {
    font: inherit; font-size: 13px;
    padding: 5px 12px; border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.25);
    background: rgba(255,255,255,0.08); color: #eee; cursor: pointer;
  }
  #toolbar button:hover { background: rgba(255,255,255,0.18); }
  #toolbar .spacer { flex: 1; }
  #zoom-label { font-size: 12px; opacity: 0.85; min-width: 52px; text-align: right; }
  #stage {
    position: fixed; inset: 0; top: 47px; overflow: hidden;
    cursor: grab;
  }
  #stage.panning { cursor: grabbing; }
  #content { transform-origin: 0 0; will-change: transform; }
  #content svg { display: block; }
  .hint {
    position: fixed; bottom: 8px; right: 12px; z-index: 10;
    font-size: 12px; opacity: 0.55; pointer-events: none;
  }
</style>
</head>
<body>
<div id="toolbar">
  <button id="zoom-out" title="Zoom out">&#8722;</button>
  <button id="zoom-in" title="Zoom in">&#43;</button>
  <button id="fit" title="Fit to screen">Fit</button>
  <button id="reset" title="100%">1:1</button>
  <div class="spacer"></div>
  <span id="zoom-label">100%</span>
</div>
<div id="stage"><div id="content">${svgMarkup}</div></div>
<div class="hint">Drag to pan &#8226; Ctrl/Cmd + wheel to zoom</div>
<script>
(function () {
  var stage = document.getElementById("stage");
  var content = document.getElementById("content");
  var svg = content.querySelector("svg");
  var label = document.getElementById("zoom-label");
  var W = 0, H = 0, scale = 1, tx = 0, ty = 0;

  function measure() {
    var vb = svg.viewBox.baseVal;
    var w = parseFloat(svg.getAttribute("width")) || vb.width || svg.getBoundingClientRect().width || 300;
    var h = parseFloat(svg.getAttribute("height")) || vb.height || svg.getBoundingClientRect().height || 150;
    W = w; H = h;
  }

  function apply() {
    content.style.transform = "translate(" + tx + "px, " + ty + "px) scale(" + scale + ")";
    label.textContent = Math.round(scale * 100) + "%";
  }

  function fit() {
    measure();
    var pad = 32;
    var vw = stage.clientWidth - pad;
    var vh = stage.clientHeight - pad;
    var s = Math.min(vw / W, vh / H, 1);
    scale = s;
    tx = (stage.clientWidth - W * s) / 2;
    ty = (stage.clientHeight - H * s) / 2;
    apply();
  }

  function reset() {
    measure();
    scale = 1;
    tx = Math.max(8, (stage.clientWidth - W) / 2);
    ty = Math.max(8, (stage.clientHeight - H) / 2);
    apply();
  }

  document.getElementById("zoom-in").addEventListener("click", function () {
    scale = Math.min(10, scale * 1.25); apply();
  });
  document.getElementById("zoom-out").addEventListener("click", function () {
    scale = Math.max(0.05, scale / 1.25); apply();
  });
  document.getElementById("fit").addEventListener("click", fit);
  document.getElementById("reset").addEventListener("click", reset);

  var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
  stage.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;
    dragging = true; sx = e.clientX; sy = e.clientY;
    ox = tx; oy = ty;
    stage.classList.add("panning");
    e.preventDefault();
  });
  window.addEventListener("mousemove", function (e) {
    if (!dragging) return;
    tx = ox + (e.clientX - sx);
    ty = oy + (e.clientY - sy);
    apply();
  });
  window.addEventListener("mouseup", function () {
    dragging = false; stage.classList.remove("panning");
  });
  window.addEventListener("blur", function () {
    dragging = false; stage.classList.remove("panning");
  });
  stage.addEventListener("wheel", function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    var factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    scale = Math.max(0.05, Math.min(10, scale * factor));
    apply();
  }, { passive: false });

  window.addEventListener("resize", fit);
  fit();
})();
</script>
</body>
</html>`;

  return new Blob([html], { type: "text/html;charset=utf-8" });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}