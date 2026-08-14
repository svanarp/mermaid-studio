import { svgToStandaloneBlob } from "./svg";

export interface RasterOptions {
  scale: number;
  background: string;
}

export async function svgToPngBlob(
  svg: SVGSVGElement,
  opts: RasterOptions
): Promise<Blob> {
  const svgBlob = await svgToStandaloneBlob(svg);
  const dataUri = await blobToDataUri(svgBlob);
  const img = await loadImage(dataUri);
  const w = Math.max(1, Math.round((img.naturalWidth || 100) * opts.scale));
  const h = Math.max(1, Math.round((img.naturalHeight || 100) * opts.scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");
  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await canvasToBlob(canvas);
  return blob;
}

export async function copyPngToClipboard(svg: SVGSVGElement): Promise<void> {
  const blob = await svgToPngBlob(svg, { scale: 2, background: "#ffffff" });
  const item = new ClipboardItem({ "image/png": blob });
  await navigator.clipboard.write([item]);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load SVG for rasterization."));
    img.src = url;
  });
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read SVG blob."));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Failed to encode PNG."));
    }, "image/png");
  });
}