import fs from 'node:fs';
import path from 'node:path';

const appPath = path.join(path.resolve(process.cwd()), 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);
let source = fs.readFileSync(appPath, 'utf8');

// This is the final build-time cleanup pass. Historical transformers edit the
// same App.tsx in place, and some older passes can duplicate whole top-level
// sections. The cleanup must therefore remove duplicate declarations broadly,
// not just the handful of helpers that originally triggered the first error.
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

// Clean every function that has appeared more than once in the generated app.
// Keep the first copy and remove subsequent copies. This is intentionally
// idempotent: once the source has one declaration, the pass does nothing.
const duplicateFunctionNames = [
  'num', 'normalizeOdk', 'normalizeYardLine', 'yardLineToFieldPosition',
  'calculateGnls', 'formatGnls', 'deriveLiveGains', 'recalculateLiveGains',
  'isExplosive', 'average', 'csvCell', 'download', 'normalizeHeader', 'parseCsv',
  'insertLivePlay', 'updateLivePlay', 'deleteLivePlay', 'AppShell', 'PageHead',
  'Panel', 'SectionTitle', 'Toast', 'useToast', 'Kpi', 'Dashboard', 'UploadPage',
  'ScoutPage', 'LivePage', 'LiveSpreadsheetPage', 'ReportsHubPage', 'SchedulePage',
  'NotFoundPage', 'HudlCsvExportBar', 'Router', 'App', 'ReportsPage',
];

for (const name of duplicateFunctionNames) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  totalRemoved += removeDuplicateFunctions(name, new RegExp(`function\\s+${escaped}\\s*\\(`, 'g'));
}

const malformedReports = /\n:\s*\{ data:\s*Dataset \}\)\s*\{/g;
if (malformedReports.test(source)) {
  source = source.replace(malformedReports, '\nfunction ReportsPage({ data }: { data: Dataset }) {');
  totalRemoved++;
}

// A duplicated App export is a separate syntax error even after duplicate
// function declarations are removed. Retain only the final/default export.
const defaultAppExports = [...source.matchAll(/export\s+default\s+App\s*;/g)];
if (defaultAppExports.length > 1) {
  for (let i = defaultAppExports.length - 2; i >= 0; i--) {
    const start = defaultAppExports[i].index;
    const end = start + defaultAppExports[i][0].length;
    source = source.slice(0, start) + source.slice(end);
    totalRemoved++;
  }
}

fs.writeFileSync(appPath, source);
console.log(`Generated declaration cleanup complete${totalRemoved ? `; removed ${totalRemoved} duplicate declaration(s)` : ''}.`);
