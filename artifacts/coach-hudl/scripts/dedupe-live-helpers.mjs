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

totalRemoved += removeDuplicateSimpleDeclarations('STORAGE_KEY', /const\s+STORAGE_KEY\s*=\s*['"]coach-hudl-datasets-v2['"]\s*;/g, ';');
totalRemoved += removeDuplicateSimpleDeclarations('demoSchedule', /const\s+demoSchedule\s*:\s*ScheduleGame\[\]\s*=\s*\[/g, '];');
totalRemoved += removeDuplicateSimpleDeclarations('demoScouting', /const\s+demoScouting\s*:\s*Play\[\]\s*=\s*\[/g, '];');
totalRemoved += removeDuplicateSimpleDeclarations('emptyDataset', /const\s+emptyDataset\s*:\s*Dataset\s*=\s*\{/g, '};');
totalRemoved += removeDuplicateSimpleDeclarations('headerAliases', /const\s+headerAliases\s*:\s*Record<keyof Play, string\[\]>\s*=\s*\{/g, '};');

const duplicateFunctionNames = [
  'num', 'normalizeOdk', 'normalizeYardLine', 'yardLineToFieldPosition',
  'calculateGnls', 'formatGnls', 'deriveLiveGains', 'recalculateLiveGains',
  'isExplosive', 'average', 'csvCell', 'download', 'normalizeHeader', 'parseCsv',
  'insertLivePlay', 'updateLivePlay', 'deleteLivePlay', 'safeLoad', 'saveDataset',
  'AppShell', 'PageHead', 'Panel', 'SectionTitle', 'Toast', 'useToast', 'Kpi',
  'Dashboard', 'UploadPage', 'ScoutPage', 'LivePage', 'LiveSpreadsheetPage',
  'ReportsHubPage', 'SchedulePage', 'NotFoundPage', 'HudlCsvExportBar', 'Router',
  'App', 'ReportsPage',
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

const duplicateAsyncPattern = /\basync(?:\s+async)+\b/g;
const asyncMatches = source.match(duplicateAsyncPattern);
if (asyncMatches?.length) {
  source = source.replace(duplicateAsyncPattern, 'async');
  totalRemoved += asyncMatches.length;
}

const asyncDefaultExportPattern = /\basync\s+(export\s+default\s+App\s*;)/g;
const asyncDefaultExports = source.match(asyncDefaultExportPattern);
if (asyncDefaultExports?.length) {
  source = source.replace(asyncDefaultExportPattern, '$1');
  totalRemoved += asyncDefaultExports.length;
}

const defaultAppExports = [...source.matchAll(/export\s+default\s+App\s*;/g)];
if (defaultAppExports.length > 1) {
  for (let i = defaultAppExports.length - 2; i >= 0; i--) {
    const start = defaultAppExports[i].index;
    const end = start + defaultAppExports[i][0].length;
    source = source.slice(0, start) + source.slice(end);
    totalRemoved++;
  }
}

// add-live-reports historically generated a Reports route that referenced a
// nonexistent `data` variable in the router scope. That compiles but crashes
// the entire React app at runtime with `ReferenceError: data is not defined`.
// Use the app's existing persisted dataset loader instead.
const reportRoutePatterns = [
  '<Route path="/reports"><ReportsHubPage data={data} /></Route>',
  '<Route path="/reports"><LiveReportsPage data={data} /></Route>',
];
const reportRouteReplacement = '<Route path="/reports"><LiveReportsPage data={safeLoad()} /></Route>';
for (const route of reportRoutePatterns) {
  if (source.includes(route)) {
    source = source.replace(route, reportRouteReplacement);
    totalRemoved++;
  }
}

fs.writeFileSync(appPath, source);
console.log(`Generated declaration cleanup complete${totalRemoved ? `; removed ${totalRemoved} duplicate declaration(s)` : ''}.`);
