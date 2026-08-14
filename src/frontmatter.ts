export interface FrontmatterResult {
  config: Record<string, unknown>;
  code: string;
}

/**
 * Extracts %%{init: {...}}%% blocks, JSON-parses each and merges them in
 * order. Unparseable blocks are left in place so mermaid can surface its own
 * error. Uses a balanced-brace scan (instead of a regex) so nested JSON
 * objects are captured correctly.
 */
export function extractFrontmatter(code: string): FrontmatterResult {
  const config: Record<string, unknown> = {};
  let cleaned = code;
  const blocks: Array<{ start: number; end: number; json: string }> = [];

  let i = 0;
  while (i < code.length) {
    const start = code.indexOf("%%{init:", i);
    if (start < 0) break;

    const jsonStart = findJsonStart(code, start + 8);
    if (jsonStart < 0) break;

    const jsonEnd = findJsonEnd(code, jsonStart);
    if (jsonEnd < 0) break;

    // The init block is `%%{init: JSON}%%` — after the JSON's closing brace
    // there may be a `}` that closes the `{init:` brace, then `%%`.
    let after = jsonEnd + 1;
    if (code[after] === "}") after++;
    if (!code.startsWith("%%", after)) {
      i = after;
      continue;
    }

    blocks.push({ start, end: after + 2, json: code.slice(jsonStart, jsonEnd + 1) });
    i = after + 2;
  }

  if (blocks.length) {
    const kept: Array<{ start: number; end: number; text: string }> = [];
    for (const b of blocks) {
      try {
        const parsed = JSON.parse(b.json) as Record<string, unknown>;
        Object.assign(config, parsed);
        kept.push({ start: b.start, end: b.end, text: "" });
      } catch {
        kept.push({ start: b.start, end: b.end, text: code.slice(b.start, b.end) });
      }
    }
    let out = "";
    let last = 0;
    for (const k of kept) {
      out += code.slice(last, k.start) + k.text;
      last = k.end;
    }
    out += code.slice(last);
    cleaned = out.replace(/^\s*\n/, "");
  }

  return { config, code: cleaned };
}

function findJsonStart(code: string, from: number): number {
  for (let j = from; j < code.length; j++) {
    const c = code[j];
    if (c === "{") return j;
    if (c === "\n" || (c === "%" && code.startsWith("%%", j))) return -1;
  }
  return -1;
}

function findJsonEnd(code: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let j = start; j < code.length; j++) {
    const c = code[j];
    if (inString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
    } else if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}