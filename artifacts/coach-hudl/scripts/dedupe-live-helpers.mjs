import fs from 'node:fs';
import path from 'node:path';

const appPath = path.join(path.resolve(process.cwd()), 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);
let source = fs.readFileSync(appPath, 'utf8');

function findFunctionEnd(text, start) {
  const brace = text.indexOf('{', start);
  if (brace < 0) return -1;
  let depth = 0;
  let quote = null;
  for (let i = brace; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

// Several Live Game prebuild passes can independently add the same helpers.
// Keep the first definition of each helper and remove later duplicates so the
// generated App.tsx cannot fail with block-scoped redeclaration errors.
const marker = 'LIVE_HELPERS_DEDUPED';
if (source.includes(marker)) process.exit(0);

const helpers = [
  /function\s+num\s*\(value:\s*string\)\s*\{/g,
  /function\s+normalizeOdk\s*\(value:\s*string\)\s*\{/g,
];

let totalRemoved = 0;
for (const pattern of helpers) {
  let match;
  let first = true;
  const removals = [];
  while ((match = pattern.exec(source)) !== null) {
    if (first) {
      first = false;
      continue;
    }
    const end = findFunctionEnd(source, match.index);
    if (end < 0) throw new Error(`Could not determine duplicate helper boundary near ${match.index}`);
    let removeEnd = end;
    while (removeEnd < source.length && (source[removeEnd] === '\n' || source[removeEnd] === '\r')) removeEnd++;
    removals.push([match.index, removeEnd]);
    pattern.lastIndex = removeEnd;
  }
  for (let i = removals.length - 1; i >= 0; i--) {
    const [start, end] = removals[i];
    source = source.slice(0, start) + source.slice(end);
    totalRemoved++;
  }
}

source += `\n// ${marker}\n`;
fs.writeFileSync(appPath, source);
console.log(`Live helper dedupe complete${totalRemoved ? `; removed ${totalRemoved} duplicate helper declaration(s)` : ''}.`);
