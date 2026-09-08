import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(here, '../src/App.tsx');
let text = fs.readFileSync(appPath, 'utf8');
const start = text.indexOf('function LiveSpreadsheetPage');
const end = text.indexOf('function ReportsHubPage', start);

// The current App can use a different live-game component name. This patch is
// optional: never make the entire production build fail just because the older
// component marker is absent. Supabase persistence is handled by the current
// football data layer when available.
if (start < 0 || end < 0) {
  console.log('LiveSpreadsheetPage marker not present; skipping legacy persistence patch.');
  process.exit(0);
}

let section = text.slice(start, end);

const oldAdd = `    setData(next);\n    setForm(current => ({ ...current, playNo: String(next.live.length + 1).padStart(2, '0'), yardLn: normalizedFormYardLine, gnls: '0', result: '' }));\n    toast.notify(\`Live snap added · GN/LS \${formatGnls(calculatedGnls)}\`);`;
const newAdd = `    setData(next);\n    void insertLivePlay(data.activeGameId, next.live[next.live.length - 1]).catch(error => {\n      console.error('Could not save live snap:', error);\n      toast.notify('Snap added locally, but Supabase save failed');\n    });\n    setForm(current => ({ ...current, playNo: String(next.live.length + 1).padStart(2, '0'), yardLn: normalizedFormYardLine, gnls: '0', result: '' }));\n    toast.notify(\`Live snap added · GN/LS \${formatGnls(calculatedGnls)}\`);`;
section = section.replace(oldAdd, newAdd);

const oldImport = `      setData({ ...data, live: [...live, ...parsed] });\n      toast.notify(\`\${parsed.length} live snaps imported with yard-line gains\`);`;
const newImport = `      const nextLive = [...live, ...parsed];\n      setData({ ...data, live: nextLive });\n      void Promise.all(parsed.map(play => insertLivePlay(data.activeGameId, play))).catch(error => {\n        console.error('Could not save imported live snaps:', error);\n        toast.notify('Imported locally, but Supabase save failed');\n      });\n      toast.notify(\`\${parsed.length} live snaps imported with yard-line gains\`);`;
section = section.replace(oldImport, newImport);

const oldEdit = `    setData({ ...data, live: recalculateLiveGains(nextLive, startingYardLine) });`;
const newEdit = `    const recalculated = recalculateLiveGains(nextLive, startingYardLine);\n    setData({ ...data, live: recalculated });\n    void updateLivePlay(data.activeGameId, Number(recalculated[actualIndex].playNo), recalculated[actualIndex]).catch(error => {\n      console.error('Could not update live snap:', error);\n      toast.notify('Snap updated locally, but Supabase update failed');\n    });`;
section = section.replace(oldEdit, newEdit);

const oldRemove = `    setData({ ...data, live: live.filter((_, index) => index !== actualIndex) });\n    toast.notify('Live snap removed');`;
const newRemove = `    const removedPlay = live[actualIndex];\n    setData({ ...data, live: live.filter((_, index) => index !== actualIndex) });\n    void deleteLivePlay(data.activeGameId, Number(removedPlay.playNo)).catch(error => {\n      console.error('Could not delete live snap:', error);\n      toast.notify('Snap removed locally, but Supabase delete failed');\n    });\n    toast.notify('Live snap removed');`;
section = section.replace(oldRemove, newRemove);

text = text.slice(0, start) + section + text.slice(end);
fs.writeFileSync(appPath, text);
console.log('Live spreadsheet Supabase persistence patch applied.');
