import fs from 'node:fs';
import path from 'node:path';

const appPath = path.join(path.resolve(process.cwd()), 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);
let source = fs.readFileSync(appPath, 'utf8');

// This is the final build-time cleanup pass. Several historical transformers
// still edit App.tsx in place. Cleanup must therefore understand both normal
// top-level declarations and function signatures that contain destructuring.
function findFunctionBodyStart(text, start) {
  const signatureEnd = text.indexOf(')', start);
  if (signatureEnd < 0) return -1;
  return text.indexOf('{', signatureEnd);
}

function findFunctionEnd(text, start) {
  const brace = findFunctionBodyStart(text, start);
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

function removeDuplicateFunctions(name, pattern) {
  let match;
  let first = true;
  const removals = [];
  pattern.lastIndex = 0;
  while ((match = pattern.exec(source)) !== null) {
    if (first) {
      first = false;
      continue;
    }
    const end = findFunctionEnd(source, match.index);
    if (end < 0) throw new Error(`Could not determine duplicate ${name} boundary near ${match.index}`);
    let removeEnd = end;
    while (removeEnd < source.length && (source[removeEnd] === '\n' || source[removeEnd] === '\r')) removeEnd++;
    removals.push([match.index, removeEnd]);
    pattern.lastIndex = removeEnd;
  }
  for (let i = removals.length - 1; i >= 0; i--) {
    const [start, end] = removals[i];
    source = source.slice(0, start) + source.slice(end);
  }
  return removals.length;
}

function removeDuplicateSimpleDeclarations(name, pattern, endToken) {
  let match;
  let first = true;
  const removals = [];
  pattern.lastIndex = 0;
  while ((match = pattern.exec(source)) !== null) {
    if (first) {
      first = false;
      continue;
    }
    const end = source.indexOf(endToken, match.index);
    if (end < 0) throw new Error(`Could not determine duplicate ${name} boundary near ${match.index}`);
    let removeEnd = end + endToken.length;
    while (removeEnd < source.length && (source[removeEnd] === '\n' || source[removeEnd] === '\r')) removeEnd++;
    removals.push([match.index, removeEnd]);
    pattern.lastIndex = removeEnd;
  }
  for (let i = removals.length - 1; i >= 0; i--) {
    const [start, end] = removals[i];
    source = source.slice(0, start) + source.slice(end);
  }
  return removals.length;
}

let totalRemoved = 0;

// Duplicate top-level constants are build-breaking and must be cleaned too.
totalRemoved += removeDuplicateSimpleDeclarations('STORAGE_KEY', /const\s+STORAGE_KEY\s*=\s*['"]coach-hudl-datasets-v2['"]\s*;/g, ';');
totalRemoved += removeDuplicateSimpleDeclarations('demoSchedule', /const\s+demoSchedule\s*:\s*ScheduleGame\[\]\s*=\s*\[/g, '];');
totalRemoved += removeDuplicateSimpleDeclarations('demoScouting', /const\s+demoScouting\s*:\s*Play\[\]\s*=\s*\[/g, '];');
totalRemoved += removeDuplicateSimpleDeclarations('emptyDataset', /const\s+emptyDataset\s*:\s*Dataset\s*=\s*\{/g, '};');
totalRemoved += removeDuplicateSimpleDeclarations('headerAliases', /const\s+headerAliases\s*:\s*Record<keyof Play, string\[\]>\s*=\s*\{/g, '};');

totalRemoved += removeDuplicateFunctions('num', /function\s+num\s*\(value:\s*string\)\s*\{/g);
totalRemoved += removeDuplicateFunctions('normalizeOdk', /function\s+normalizeOdk\s*\(value:\s*string\)\s*\{/g);
totalRemoved += removeDuplicateFunctions('ReportsPage', /function\s+ReportsPage\s*\(/g);

const malformedReports = /\n:\s*\{ data:\s*Dataset \}\)\s*\{/g;
if (malformedReports.test(source)) {
  source = source.replace(malformedReports, '\nfunction ReportsPage({ data }: { data: Dataset }) {');
  totalRemoved++;
}

fs.writeFileSync(appPath, source);
console.log(`Generated declaration cleanup complete${totalRemoved ? `; removed ${totalRemoved} duplicate declaration(s)` : ''}.`);
