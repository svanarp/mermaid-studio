export function svgToString(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("xmlns:presentation", "http://www.w3.org/2000/svg");
  const xml = new XMLSerializer().serializeToString(clone);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}

export function svgToBlob(svg: SVGSVGElement): Blob {
  return new Blob([svgToString(svg)], { type: "image/svg+xml;charset=utf-8" });
}

/** Serialize the SVG as a fully self-contained standalone SVG document. */
export async function svgToStandaloneString(svg: SVGSVGElement): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const images = clone.querySelectorAll("image");
  for (const img of Array.from(images)) {
    const href =
      img.getAttribute("href") || img.getAttribute("xlink:href") || "";
    if (href.startsWith("data:")) continue;
    try {
      const res = await fetch(href);
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      img.setAttribute("href", dataUrl);
    } catch {
      // leave un-inlined
    }
  }
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  const xml = new XMLSerializer().serializeToString(clone);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}

/** Inline external images/styles so the SVG is fully self-contained. */
export async function svgToStandaloneBlob(svg: SVGSVGElement): Promise<Blob> {
  const str = await svgToStandaloneString(svg);
  return new Blob([str], { type: "image/svg+xml;charset=utf-8" });
}