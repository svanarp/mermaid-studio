import { highlight } from "../src/highlighter";
import { extractFrontmatter } from "../src/frontmatter";
import { sanitizeFilename } from "../src/export/filename";

let failures = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${detail}`);
  }
}

console.log("highlighter");
{
  const h = highlight("graph TD\n  A[Start] --> B{Ready?}\n  %% a comment\n  B -->|yes| C");
  assert("type keyword", h.includes('tok-type">graph<'));
  assert("node bracket", h.includes('tok-node">[Start]<'));
  assert("edge", h.includes('tok-edge">--&gt;<'));
  assert("comment", h.includes("tok-comment"));
  assert("escapes html", !highlight("<script>").includes("<script>"));
  const plain = h
    .replace(/<[^>]+>/g, "")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
  assert(
    "char preservation (no span splits text)",
    plain === "graph TD\n  A[Start] --> B{Ready?}\n  %% a comment\n  B -->|yes| C"
  );
}

console.log("frontmatter");
{
  const r = extractFrontmatter('%%{init: {"theme": "dark"}}%%\ngraph TD\n  A-->B');
  assert("parses init config", JSON.stringify(r.config) === '{"theme":"dark"}');
  assert("strips block", !r.code.includes("init") && r.code.startsWith("graph"));
}
{
  const r = extractFrontmatter("graph TD\n  A-->B");
  assert(
    "no frontmatter unchanged",
    r.code === "graph TD\n  A-->B" && Object.keys(r.config).length === 0
  );
}
{
  const r = extractFrontmatter(
    '%%{init: {"flowchart": {"curve": "linear"}}%%\n%%{init: {"theme": "forest"}}%%\ngraph TD\n  A-->B'
  );
  assert(
    "merges multiple blocks",
    r.config.theme === "forest" &&
      (r.config.flowchart as { curve: string }).curve === "linear"
  );
}
{
  const r = extractFrontmatter("%%{init: {bad json}}%%\ngraph TD\n  A-->B");
  assert(
    "invalid json left in place",
    r.code.includes("{bad json}") && Object.keys(r.config).length === 0
  );
}

console.log("filename");
assert("sanitize", sanitizeFilename('My "cool" / diagram: v2') === "My-cool-diagram-v2");
assert("empty fallback", sanitizeFilename("  ") === "diagram");

process.exit(failures ? 1 : 0);