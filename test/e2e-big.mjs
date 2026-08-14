import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "dist");
const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://x");
  const file = join(root, url.pathname === "/" ? "/index.html" : url.pathname);
  if (!existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html" });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4174, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
const page = await browser.newPage();
await page.goto("http://localhost:4174/", { waitUntil: "load" });

let failures = 0;
function assert(name, cond, detail = "") {
  if (cond) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name} ${detail}`); }
}

// big flowchart
const big = `graph TD
  A0[Start] --> A1[Init config]
  A1 --> A2[Load data]
  A2 --> A3{valid?}
  A3 -->|yes| A4[Process]
  A3 -->|no| A5[Error path]
  A4 --> A6[Transform]
  A6 --> A7{retry?}
  A7 -->|yes| A8[Backoff]
  A8 --> A6
  A7 -->|no| A9[Log]
  A9 --> A10[Cleanup]
  A10 --> A11[Done]
  A5 --> A12[Report]
  A12 --> A11
  A0 --> B1[Branch B]
  B1 --> B2[Long node label that should not wrap]
  B2 --> B3[Another fairly long label]
  B3 --> B4[And one more]
  B4 --> B5[Final]
  A4 --> C1[Parallel C]
  C1 --> C2[Task c2]
  C1 --> C3[Task c3]
  C2 --> C4[Merge]
  C3 --> C4
  C4 --> A6`;

await page.fill("#code-input", big);
await page.waitForTimeout(1500);

// svg should have explicit pixel width matching viewBox width
const info = await page.evaluate(() => {
  const svg = document.querySelector("#stage svg");
  const vb = svg.viewBox.baseVal;
  return {
    vbW: vb.width,
    vbH: vb.height,
    attrW: svg.getAttribute("width"),
    styleW: svg.style.width,
    maxW: svg.style.maxWidth,
    renderedW: svg.getBoundingClientRect().width,
    renderedH: svg.getBoundingClientRect().height,
  };
});
assert("viewBox has big width", info.vbW > 400, `got ${info.vbW}`);
assert("width attr is explicit px", info.attrW === `${info.vbW}px`, `attr=${info.attrW} vb=${info.vbW}`);
assert("style maxWidth none", info.maxW === "none", `got ${info.maxW}`);

// rendered size should now match natural size (before zoom), not shrink-fitted
// (fit() is applied on render, so assert natural size via 1:1 instead)
await page.click('[data-zoom="100"]');
await page.waitForTimeout(300);
const one2one = await page.evaluate(() => {
  const svg = document.querySelector("#stage svg");
  const m = document.getElementById("stage").style.transform.match(/scale\(([\d.]+)\)/);
  return { scale: m ? parseFloat(m[1]) : 1, rectW: svg.getBoundingClientRect().width };
});
assert("1:1 scale is 1", Math.abs(one2one.scale - 1) < 0.01, `scale=${one2one.scale}`);
assert(
  "1:1 rendered width == natural width",
  Math.abs(one2one.rectW - info.vbW) < 2,
  `rendered=${one2one.rectW} vb=${info.vbW}`
);

// Fit should scale DOWN below 1 so whole diagram fits viewport
await page.click('[data-zoom="fit"]');
await page.waitForTimeout(300);
const fitState = await page.evaluate(() => {
  const stage = document.getElementById("stage");
  const m = stage.style.transform.match(/scale\(([\d.]+)\)/);
  return { scale: m ? parseFloat(m[1]) : 1 };
});
assert("fit scales below 1 for big diagram", fitState.scale < 1, `scale=${fitState.scale}`);

// PNG export should produce a large image
const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.click("#btn-export-png"),
]);
const stream = await download.createReadStream();
const chunks = [];
for await (const c of stream) chunks.push(c);
const buf = Buffer.concat(chunks);
const png = buf; // PNG: signature 8 bytes, then IHDR width/height big-endian
const w = png.readUInt32BE(16);
const h = png.readUInt32BE(20);
assert("PNG width >= diagram width (scale 2)", w >= info.vbW * 2 * 0.9, `pngW=${w} expected>=${info.vbW * 2}`);
assert("PNG height >= diagram height", h >= info.vbH * 2 * 0.9, `pngH=${h} expected>=${info.vbH * 2}`);
assert("PNG sizable", w > 600 && h > 200, `png=${w}x${h}`);

await browser.close();
server.close();
process.exit(failures ? 1 : 0);