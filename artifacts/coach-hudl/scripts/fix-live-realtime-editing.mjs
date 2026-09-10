import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);
let source = fs.readFileSync(appPath, 'utf8');

// Make saved Live Game edits durable immediately, but never make the production
// build fail when the current Live Game implementation does not use this helper.
const marker = 'LIVE_REALTIME_EDITING_HARDENED';
if (source.includes(marker)) process.exit(0);

const liveStartCandidates = [
  source.lastIndexOf('function LiveSpreadsheetPage'),
  source.lastIndexOf('function LivePage'),
].filter(index => index >= 0);
const liveStart = liveStartCandidates.length ? Math.max(...liveStartCandidates) : -1;
if (liveStart < 0) {
  console.log('No Live Game component marker found; skipping realtime edit patch.');
  process.exit(0);
}

const nextFunction = source.indexOf('\nfunction ', liveStart + 1);
const liveEnd = nextFunction >= 0 ? nextFunction : source.length;
const section = source.slice(liveStart, liveEnd);
const localStart = section.indexOf('const updateLiveRow = ');
if (localStart < 0) {
  console.log('updateLiveRow is not used by the current Live Game component; skipping realtime edit patch.');
  process.exit(0);
}

const start = liveStart + localStart;
const brace = source.indexOf('{', start);
if (brace < 0) {
  console.log('updateLiveRow body not found; skipping realtime edit patch.');
  process.exit(0);
}
let depth = 0, quote = null, end = -1;
for (let i = brace; i < source.length; i++) {
  const c = source[i];
  if (quote) {
    if (c === '\\') i++;
    else if (c === quote) quote = null;
    continue;
  }
  if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
if (end < 0) {
  console.log('Could not determine updateLiveRow boundary; skipping realtime edit patch.');
  process.exit(0);
}

const replacement = `const updateLiveRow = (displayIndex: number, key: keyof Play, value: string) => {\n    const actualIndex = live.length - 1 - displayIndex;\n    const nextLive = live.map((play, index) => index === actualIndex ? { ...play, [key]: key === 'odk' ? normalizeOdk(value) : value } : play);\n    const recalculated = recalculateLiveGains(nextLive, startingYardLine);\n    const edited = recalculated[actualIndex];\n    setData(current => ({ ...current, live: recalculated }));\n    if (!edited || !data.activeGameId) return;\n    void updateLivePlayByNumber(data.activeGameId, Number(edited.playNo) || actualIndex + 1, edited)\n      .then(async saved => {\n        if (!saved) return;\n        const persisted = livePlayToStandard(saved);\n        setData(current => ({ ...current, live: current.live.map(play => Number(play.playNo) === Number(persisted.playNo) ? persisted : play) }));\n      })\n      .catch(error => {\n        console.error('Could not save edited live snap:', error);\n        toast.notify('Edit was NOT saved to Supabase.');\n      });\n  };\n  // ${marker}`;

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(appPath, source);
console.log('Live realtime editing hardened.');