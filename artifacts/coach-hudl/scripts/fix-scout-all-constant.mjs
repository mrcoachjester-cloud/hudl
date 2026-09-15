import fs from 'node:fs';
import path from 'node:path';

const appPath = path.resolve(process.cwd(), 'artifacts/coach-hudl/src/App.tsx');
const source = fs.readFileSync(appPath, 'utf8');

if (!source.includes("const SCOUT_ALL = 'ALL';")) {
  const marker = 'type Play = StandardPlay;\n';
  if (!source.includes(marker)) throw new Error('Could not find Play type marker in App.tsx');
  fs.writeFileSync(appPath, source.replace(marker, `${marker}\nconst SCOUT_ALL = 'ALL';\n`));
  console.log('Added missing SCOUT_ALL constant.');
} else {
  console.log('SCOUT_ALL already defined.');
}
