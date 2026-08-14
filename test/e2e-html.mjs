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
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));

let failures = 0;
function assert(name, cond, detail = "") {
  if (cond) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name} ${detail}`); }
}

await page.goto("http://localhost:4174/", { waitUntil: "load" });
await page.waitForTimeout(1500);

/* ---- HTML export ---- */
const [dl] = await Promise.all([
  page.waitForEvent("download"),
  page.click("#btn-export-html"),
]);
assert("html download name", dl.suggestedFilename().endsWith(".html"), dl.suggestedFilename());

const stream = await dl.createReadStream();
const chunks = [];
for await (const c of stream) chunks.push(c);
const html = Buffer.concat(chunks).toString("utf-8");
assert("html embeds svg", html.includes("<svg") && html.includes("</svg>"), "no svg");
assert("html has toolbar", html.includes('id="zoom-in"') && html.includes('id="zoom-out"'));
assert("html has fit+reset", html.includes('id="fit"') && html.includes('id="reset"'));
assert("html has hand cursor", html.includes("cursor: grab") && html.includes("cursor: grabbing"));
assert("html drags pan", html.includes("mousedown") && html.includes("mousemove"));
assert("html prevents page scroll", html.includes("overflow: hidden") || html.includes("overflow:hidden"));
assert("html no browser scrollbars via body", html.includes("height: 100%; overflow: hidden") || html.includes("height:100%;overflow:hidden"));
assert("html has wheel zoom", html.includes("wheel"));
assert("html is self-contained (no external src)", !html.includes("<script src=") && !html.includes('<link rel="stylesheet"'));

/* ---- Open exported HTML and test in-page zoom + pan ---- */
const dlPage = await browser.newPage();
dlPage.on("pageerror", (e) => { failures++; console.error("EXPORTED PAGE ERROR:", e.message); });
const dlHtml = Buffer.concat(chunks).toString("utf-8");
const { server: dlServer } = await serveString(dlHtml);
await dlPage.goto(`http://localhost:${dlServer.address().port}/`, { waitUntil: "load" });
await dlPage.waitForTimeout(500);

const cursorStyle = await dlPage.evaluate(() => {
  const st = getComputedStyle(document.getElementById("stage"));
  return st.cursor;
});
assert("exported stage hand cursor", cursorStyle === "grab", `got ${cursorStyle}`);

const svgInDl = await dlPage.locator("#content svg").count();
assert("exported svg present", svgInDl === 1);

// click zoom in twice -> scale label should grow
const before = await dlPage.evaluate(() => document.getElementById("zoom-label").textContent);
await dlPage.click("#zoom-in");
await dlPage.click("#zoom-in");
const after = await dlPage.evaluate(() => document.getElementById("zoom-label").textContent);
assert("zoom-in increases label", parseInt(after) > parseInt(before), `before=${before} after=${after}`);

// fit -> back to fit
await dlPage.click("#fit");
const fitted = await dlPage.evaluate(() => document.getElementById("zoom-label").textContent);
assert("fit restores label", parseInt(fitted) <= 100, `got ${fitted}`);

// 1:1 reset -> 100%
await dlPage.click("#reset");
const reset = await dlPage.evaluate(() => document.getElementById("zoom-label").textContent);
assert("1:1 is 100%", reset === "100%", `got ${reset}`);

// drag moves the content (hand pan)
const posBefore = await dlPage.evaluate(() => {
  const s = document.getElementById("content").style.transform;
  return s;
});
await dlPage.mouse.move(400, 300);
await dlPage.mouse.down();
await dlPage.mouse.move(500, 360, { steps: 5 });
await dlPage.mouse.up();
const posAfter = await dlPage.evaluate(() => document.getElementById("content").style.transform);
assert("drag pans content", posBefore !== posAfter, `before=${posBefore} after=${posAfter}`);

await dlPage.close();
dlServer.close();

/* ---- Dark mode: canvas color follows mermaid theme, arrows stay visible ---- */
// switch app to dark theme (chrome only)
await page.click("#btn-theme");
const appTheme = await page.evaluate(() => document.documentElement.dataset.theme);
assert("app theme toggled to dark", appTheme === "dark");

// diagram still uses default (light) theme -> canvas should be white, not dark
await page.fill("#code-input", "graph LR\n  A --> B");
await page.waitForTimeout(900);
const canvasLight = await page.evaluate(() => getComputedStyle(document.getElementById("viewport")).backgroundColor);
assert("light-theme diagram gets white canvas", canvasLight === "rgb(255, 255, 255)", `got ${canvasLight}`);

// switch mermaid theme to dark -> canvas becomes dark
await page.click("#btn-settings");
await page.selectOption("#set-theme", "dark");
await page.waitForTimeout(900);
const canvasDark = await page.evaluate(() => getComputedStyle(document.getElementById("viewport")).backgroundColor);
const isDarkish = /rgb\((1[0-9]|2[0-9]|3[0-9]),/.test(canvasDark) || canvasDark === "rgb(30, 37, 48)";
assert("dark-theme diagram gets dark canvas", isDarkish, `got ${canvasDark}`);

await browser.close();
server.close();
process.exit(failures ? 1 : 0);

import { createServer as createHttpServer } from "node:http";

function serveString(body) {
  const srv = createHttpServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(body);
  });
  return new Promise((resolve) => {
    srv.listen(0, "127.0.0.1", () => resolve({ server: srv }));
  });
}