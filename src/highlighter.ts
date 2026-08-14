const DIAGRAM_KEYWORDS =
  "graph|flowchart|sequenceDiagram|sequence|classDiagram|class|stateDiagram-v2|stateDiagram|state|erDiagram|gantt|pie|journey|gitGraph|C4Context|mindmap|quadrantChart|xychart-beta|block-beta|requirementDiagram|sankey-beta|timeline|zenuml|architecture-beta|json";

const STRUCT_KEYWORDS =
  "subgraph|end|direction|note|activate|deactivate|loop|alt|else|opt|par|rect|and|break|critical|participant|actor|autonumber|title|section|click|classDef|linkStyle|style|accTitle|accDescr|orientation|merge";

type Rule = [RegExp, string];

const RULES: Rule[] = [
  [/%%\{init:[\s\S]*?\}%%/, "frontmatter"],
  [/%%[^\n]*/, "comment"],
  [/"([^"\\\n]|\\.)*"/, "string"],
  [/'([^'\\\n]|\\.)*'/, "string"],
  [/`([^`\\\n]|\\.)*`/, "string"],
  [new RegExp(`\\b(${DIAGRAM_KEYWORDS})\\b`), "type"],
  [new RegExp(`\\b(${STRUCT_KEYWORDS})\\b`), "keyword"],
  [/\b(true|false)\b/, "keyword"],
  [/\b(LR|RL|TB|BT|TD)\b/, "direction"],
  [/-\.->|-\.-|===|==>|==|---|-->|-\?|->|-\.|--|=>|=>>|-o|-x/, "edge"],
  [/\[\[[^\]\n]*\]\]/, "node"],
  [/\(\(\([^)\n]*\)\)\)/, "node"],
  [/\(\([^)\n]*\)\)/, "node"],
  [/\{\{[^}\n]*\}\}/, "node"],
  [/\[\([^)\n]*\)\]/, "node"],
  [/\[[^\]\n]*\]/, "node"],
  [/\{[^}\n]*\}/, "node"],
  [/\([^)\n]*\)/, "node"],
  [/>[^\]\n]*\]/, "node"],
  [/(?<![A-Za-z0-9])-?\d+(\.\d+)?%?/, "number"],
];

const MASTER = new RegExp(
  RULES.map(([re], i) => `(?<g${i}>${re.source})`).join("|"),
  "gm"
);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tokenType(m: RegExpExecArray): string | null {
  const g = m.groups;
  if (!g) return null;
  for (let i = 0; i < RULES.length; i++) {
    if (g[`g${i}`] !== undefined) return RULES[i][1];
  }
  return null;
}

export function highlight(code: string): string {
  if (!code) return "";
  MASTER.lastIndex = 0;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = MASTER.exec(code))) {
    out += escapeHtml(code.slice(last, m.index));
    const type = tokenType(m);
    const text = escapeHtml(m[0]);
    if (type) out += `<span class="tok-${type}">${text}</span>`;
    else out += text;
    last = m.index + m[0].length;
  }
  out += escapeHtml(code.slice(last));
  return out;
}