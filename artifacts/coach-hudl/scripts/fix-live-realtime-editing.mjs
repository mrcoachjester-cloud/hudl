import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);
let source = fs.readFileSync(appPath, 'utf8');

// Make saved Live Game edits durable immediately, rather than waiting for a refresh.
// Scope the rewrite to the Live Game component so a similarly named helper elsewhere
// can never receive free `data` references.
const marker = 'LIVE_REALTIME_EDITING_HARDENED';
if (source.includes(marker)) process.exit(0);

function findFunctionEnd(text, start) {
  const signatureEnd = text.indexOf(')', start);
  if (signatureEnd < 0) return -1;
  const brace = text.indexOf('{', signatureEnd);
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
    else if (c === '}') { depth--; if (depth === 0) return i + 1; }
  }
  return -1;
}

const liveMatches = [...source.matchAll(/function\s+(LiveSpreadsheetPage|LivePage)\s*\(/g)];
if (!liveMatches.length) throw new Error('Could not find Live Game component');

let targetStart = -1;
let targetEnd = -1;
for (const match of liveMatches) {
  const start = match.index;
  const signatureEnd = source.indexOf(')', start);
  const end = findFunctionEnd(source, start);
  if (signatureEnd < 0 || end < 0) continue;
  const signature = source.slice(start, signatureEnd + 1);
  if (/\{[^}]*\bdata\b[^}]*\bsetData\b[^}]*\}/.test(signature)) {
    targetStart = start;
    targetEnd = end;
    break;
  }
}
if (targetStart < 0) {
  console.log('No scoped Live Game component with data/setData found; skipping realtime edit patch.');
  process.exit(0);
}

const section = source.slice(targetStart, targetEnd);
const localStart = section.indexOf('const updateLiveRow = ');
if (localStart < 0) throw new Error('Could not find updateLiveRow inside scoped Live Game component');
const brace = section.indexOf('{', localStart);
if (brace < 0) throw new Error('Could not find updateLiveRow body');
let depth = 0;
let quote = null;
let localEnd = -1;
for (let i = brace; i < section.length; i++) {
  const c = section[i];
  if (quote) {
    if (c === '\\') i++;
    else if (c === quote) quote = null;
    continue;
  }
  if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) { localEnd = i + 1; break; } }
}
if (localEnd < 0) throw new Error('Could not determine updateLiveRow boundary');

const replacement = `const updateLiveRow = (displayIndex: number, key: keyof Play, value: string) => {\n    const actualIndex = live.length - 1 - displayIndex;\n    const nextLive = live.map((play, index) => index === actualIndex ? { ...play, [key]: key === 'odk' ? normalizeOdk(value) : value } : play);\n    const recalculated = recalculateLiveGains(nextLive, startingYardLine);\n    const edited = recalculated[actualIndex];\n    setData(current => ({ ...current, live: recalculated }));\n    if (!edited || !data.activeGameId) return;\n    void updateLivePlayByNumber(data.activeGameId, Number(edited.playNo) || actualIndex + 1, edited)\n      .then(async saved => {\n        if (!saved) return;\n        const persisted = livePlayToStandard(saved);\n        setData(current => ({ ...current, live: current.live.map(play => Number(play.playNo) === Number(persisted.playNo) ? persisted : play) }));\n      })\n      .catch(error => {\n        console.error('Could not save edited live snap:', error);\n        toast.notify('Edit was NOT saved to Supabase.');\n      });\n  };\n  // ${marker}`;

const nextSection = section.slice(0, localStart) + replacement + section.slice(localEnd);
source = source.slice(0, targetStart) + nextSection + source.slice(targetEnd);
fs.writeFileSync(appPath, source);
console.log('Live realtime editing hardened inside the scoped Live Game component.');