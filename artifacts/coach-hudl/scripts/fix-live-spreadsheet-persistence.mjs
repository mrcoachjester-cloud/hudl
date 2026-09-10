import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(here, '../src/App.tsx');
let text = fs.readFileSync(appPath, 'utf8');

// The canonical source currently calls this component LivePage. Some later
// transforms rename/replace it with LiveSpreadsheetPage. Patch whichever exists
// so persistence is applied before the realtime collaboration transform runs.
const componentNames = ['LiveSpreadsheetPage', 'LivePage'];
let componentName = componentNames.find(name => text.includes(`function ${name}`));
if (!componentName) {
  console.log('Live Game component marker not present; skipping persistence patch.');
  process.exit(0);
}

const start = text.indexOf(`function ${componentName}`);
const nextFunction = text.indexOf('\nfunction ', start + 10);
const end = nextFunction > start ? nextFunction : text.length;
let section = text.slice(start, end);

// Make sure the helper import is present. install-live-collaboration also
// enforces this later, but persistence must be able to run independently.
const footballImportRegex = /import\s*\{([\s\S]*?)\}\s*from\s*['\"]\.\/lib\/footballData['\"];?/m;
const footballImport = text.match(footballImportRegex);
if (footballImport) {
  const required = ['createLivePlay', 'deleteLivePlayByNumber', 'updateLivePlayByNumber'];
  let names = footballImport[1].split(',').map(item => item.trim()).filter(Boolean);
  for (const name of required) if (!names.includes(name)) names.push(name);
  text = text.replace(footballImportRegex, `import { ${names.join(', ')} } from './lib/footballData';`);
}

const oldAdd = `    setData(next);\n    setForm(current => ({ ...current, playNo: String(next.live.length + 1).padStart(2, '0'), yardLn: normalizedFormYardLine, gnls: '0', result: '' }));\n    toast.notify(\`Live snap added · GN/LS \${formatGnls(calculatedGnls)}\`);`;
const newAdd = `    setData(next);\n    void createLivePlay(data.activeGameId, next.live[next.live.length - 1]).catch(error => {\n      console.error('Could not save live snap:', error);\n      toast.notify('Snap added locally, but Supabase save failed');\n    });\n    setForm(current => ({ ...current, playNo: String(next.live.length + 1).padStart(2, '0'), yardLn: normalizedFormYardLine, gnls: '0', result: '' }));\n    toast.notify(\`Live snap added · GN/LS \${formatGnls(calculatedGnls)}\`);`;
section = section.replace(oldAdd, newAdd);

const oldImport = `      setData({ ...data, live: [...live, ...parsed] });\n      toast.notify(\`\${parsed.length} live snaps imported with yard-line gains\`);`;
const newImport = `      const nextLive = [...live, ...parsed];\n      setData({ ...data, live: nextLive });\n      void Promise.all(parsed.map(play => createLivePlay(data.activeGameId, play))).catch(error => {\n        console.error('Could not save imported live snaps:', error);\n        toast.notify('Imported locally, but Supabase save failed');\n      });\n      toast.notify(\`\${parsed.length} live snaps imported with yard-line gains\`);`;
section = section.replace(oldImport, newImport);

const oldEdit = `    setData({ ...data, live: recalculateLiveGains(nextLive, startingYardLine) });`;
const newEdit = `    const recalculated = recalculateLiveGains(nextLive, startingYardLine);\n    setData({ ...data, live: recalculated });\n    void updateLivePlayByNumber(data.activeGameId, Number(recalculated[actualIndex].playNo), recalculated[actualIndex]).catch(error => {\n      console.error('Could not update live snap:', error);\n      toast.notify('Snap updated locally, but Supabase update failed');\n    });`;
section = section.replace(oldEdit, newEdit);

const oldRemove = `    setData({ ...data, live: live.filter((_, index) => index !== actualIndex) });\n    toast.notify('Live snap removed');`;
const newRemove = `    const removedPlay = live[actualIndex];\n    setData({ ...data, live: live.filter((_, index) => index !== actualIndex) });\n    if (removedPlay) {\n      void deleteLivePlayByNumber(data.activeGameId, Number(removedPlay.playNo)).catch(error => {\n        console.error('Could not delete live snap:', error);\n        toast.notify('Snap removed locally, but Supabase delete failed');\n      });\n    }\n    toast.notify('Live snap removed');`;
section = section.replace(oldRemove, newRemove);

text = text.slice(0, start) + section + text.slice(end);
fs.writeFileSync(appPath, text);
console.log(`Live spreadsheet Supabase persistence patch applied to ${componentName}.`);
