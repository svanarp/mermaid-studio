import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "dist");
let executablePath = process.env.CHROME_PATH;
if (!executablePath) {
  const cache = join(process.env.HOME || "", ".cache", "ms-playwright");
  const { readdirSync } = await import("node:fs");
  try {
    const browsers = readdirSync(cache).filter((d) => d.startsWith("chromium-"));
    if (browsers.length) {
      const cand = join(cache, browsers[0], "chrome-linux64", "chrome");
      if (existsSync(cand)) executablePath = cand;
    }
  } catch {
    // ignore
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://x");
  let path = url.pathname === "/" ? "/index.html" : url.pathname;
  const file = join(root, path);
  if (!existsSync(file)) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, {
    "Content-Type": file.endsWith(".js")
      ? "text/javascript"
      : file.endsWith(".css")
        ? "text/css"
        : "text/html",
  });
  createReadStream(file).pipe(res);
});

let failures = 0;
function assert(name, cond, detail = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${detail}`);
  }
}

await new Promise((r) => server.listen(4174, r));
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => {
  failures++;
  console.error("PAGE ERROR:", e.message);
});
page.on("console", (msg) => {
  if (msg.type() === "error") console.error("CONSOLE:", msg.text());
});

try {
  await page.goto("http://localhost:4174/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // 1. Initial diagram renders an SVG in the stage
  const svgCount = await page.locator("#stage svg").count();
  assert("initial render produces svg", svgCount > 0, `got ${svgCount}`);

  // 2. Status shows OK
  const status = await page.locator("#render-status").textContent();
  assert("render status OK", status === "OK", `got ${status}`);

  // 3. Editing triggers re-render
  await page.fill("#code-input", "graph LR\n  X --> Y");
  await page.waitForTimeout(800);
  const textAfter = await page.locator("#stage svg").textContent();
  assert("re-render after edit", textAfter.includes("Y"), `got ${textAfter?.slice(0, 80)}`);

  // 4. Syntax error shows error status
  await page.fill("#code-input", "this is not a diagram");
  await page.waitForTimeout(800);
  const errStatus = await page.locator("#render-status").textContent();
  assert("error status on bad input", errStatus === "Error", `got ${errStatus}`);

  // 5. Export SVG downloads a file
  await page.fill("#code-input", "graph TD\n  A[Hi] --> B");
  await page.waitForTimeout(800);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#btn-export-svg"),
  ]);
  assert("svg download name", download.suggestedFilename().endsWith(".svg"), download.suggestedFilename());

  // 6. Export PNG downloads a file
  const [pngDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#btn-export-png"),
  ]);
  assert("png download name", pngDownload.suggestedFilename().endsWith(".png"), pngDownload.suggestedFilename());

  // 7. Templates panel opens and loads a template
  await page.click("#btn-templates");
  const templateButtons = await page.locator("#templates-panel .template").count();
  assert("templates listed", templateButtons > 5, `got ${templateButtons}`);
  await page.locator("#templates-panel .template").first().click();
  await page.waitForTimeout(800);
  const newStatus = await page.locator("#render-status").textContent();
  assert("template loads and renders", newStatus === "OK", `got ${newStatus}`);

  // 8. Tabs: add a new tab
  const tabsBefore = await page.locator(".tab").count();
  await page.click(".tab-add");
  await page.waitForTimeout(400);
  const tabsAfter = await page.locator(".tab").count();
  assert("tab add works", tabsAfter === tabsBefore + 1, `before=${tabsBefore} after=${tabsAfter}`);

  // 9. Share button sets hash
  await page.click("#btn-share");
  const hash = await page.evaluate(() => location.hash);
  assert("share sets hash", hash.startsWith("#m="), `got ${hash}`);

  // 10. Dark theme toggle
  await page.click("#btn-theme");
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  assert("theme toggles", theme === "dark", `got ${theme}`);

  // 11. Highlight layer stays aligned with the textarea when scrollbars consume space
  // (regression: bottom-line selection broke because #code-layer's text box
  //  drifted from #code-input's when classic scrollbars were present)
  await page.addStyleTag({ content: `#code-input { scrollbar-gutter: stable both-edges; }` });
  const long = Array.from({ length: 60 }, (_, i) => `L${i}: ${"y".repeat(100)}`).join("\n");
  await page.fill("#code-input", long);
  await page.waitForTimeout(300);
  const align = await page.evaluate(() => {
    const ta = document.getElementById("code-input");
    const pre = document.getElementById("code-layer");
    const taCS = getComputedStyle(ta);
    const preCS = getComputedStyle(pre);
    const taW = ta.clientWidth - parseFloat(taCS.paddingLeft) - parseFloat(taCS.paddingRight);
    const preW = pre.clientWidth - parseFloat(preCS.paddingLeft) - parseFloat(preCS.paddingRight);
    const taH = ta.clientHeight - parseFloat(taCS.paddingTop) - parseFloat(taCS.paddingBottom);
    const preH = pre.clientHeight - parseFloat(preCS.paddingTop) - parseFloat(preCS.paddingBottom);
    return {
      consumed: ta.offsetWidth - ta.clientWidth,
      alignW: Math.abs(taW - preW),
      alignH: Math.abs(taH - preH),
    };
  });
  assert(
    "highlight aligns with textarea under classic scrollbars",
    align.consumed > 0 && align.alignW <= 1 && align.alignH <= 1,
    JSON.stringify(align),
  );

  // scroll sync still holds after compensation
  await page.evaluate(() => {
    const ta = document.getElementById("code-input");
    ta.scrollTop = ta.scrollHeight;
    ta.dispatchEvent(new Event("scroll"));
  });
  await page.waitForTimeout(100);
  const sync = await page.evaluate(() => {
    const ta = document.getElementById("code-input");
    const pre = document.getElementById("code-layer");
    return { ta: ta.scrollTop, pre: pre.scrollTop };
  });
  assert("scroll sync preserved with scrollbars", sync.ta === sync.pre, JSON.stringify(sync));

  await browser.close();
} catch (e) {
  console.error("TEST ERROR:", e);
  await browser.close().catch(() => undefined);
  process.exit(1);
} finally {
  server.close();
}

process.exit(failures ? 1 : 0);