export interface Preview {
  setSvg(svg: SVGSVGElement | null): void;
  fit(): void;
  zoom(factor: number): void;
  reset(): void;
  clear(): void;
}

interface ZoomState {
  scale: number;
  tx: number;
  ty: number;
}

export function initPreview(
  viewport: HTMLElement,
  stage: HTMLElement
): Preview {
  const z: ZoomState = { scale: 1, tx: 0, ty: 0 };

  function apply(): void {
    stage.style.transform = `translate(${z.tx}px, ${z.ty}px) scale(${z.scale})`;
  }

  function fit(): void {
    const svg = stage.querySelector("svg");
    if (!svg) {
      z.scale = 1;
      z.tx = 0;
      z.ty = 0;
      apply();
      return;
    }
    const vb = svg.viewBox.baseVal;
    const vw = vb.width || svg.getBoundingClientRect().width;
    const available = viewport.clientWidth - 32;
    const vh = viewport.clientHeight - 32;
    const fitW = available / vw;
    const fitH = vh / (vb.height || svg.getBoundingClientRect().height);
    const base = Math.min(fitW, fitH, 1);
    z.scale = base;
    z.tx = Math.max(8, (viewport.clientWidth - vw * base) / 2);
    z.ty = Math.max(8, (viewport.clientHeight - (vb.height * base)) / 2);
    apply();
  }

  function center(): void {
    const svg = stage.querySelector("svg");
    if (!svg) return;
    const vb = svg.viewBox.baseVal;
    z.tx = Math.max(8, (viewport.clientWidth - vb.width * z.scale) / 2);
    z.ty = Math.max(8, (viewport.clientHeight - vb.height * z.scale) / 2);
    apply();
  }

  function zoom(factor: number): void {
    z.scale = Math.max(0.05, Math.min(10, z.scale * factor));
    center();
  }

  function reset(): void {
    z.scale = 1;
    z.tx = 0;
    z.ty = 0;
    apply();
  }

  function setSvg(svg: SVGSVGElement | null): void {
    stage.textContent = "";
    if (svg) {
      stage.appendChild(svg);
      fit();
    } else {
      z.scale = 1;
      z.tx = 0;
      z.ty = 0;
      apply();
    }
  }

  // drag to pan
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let origTx = 0;
  let origTy = 0;

  viewport.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origTx = z.tx;
    origTy = z.ty;
    viewport.classList.add("panning");
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    z.tx = origTx + (e.clientX - startX);
    z.ty = origTy + (e.clientY - startY);
    apply();
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
    viewport.classList.remove("panning");
  });

  viewport.addEventListener("wheel", (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoom(factor);
  }, { passive: false });

  return { setSvg, fit, zoom, reset, clear: () => setSvg(null) };
}