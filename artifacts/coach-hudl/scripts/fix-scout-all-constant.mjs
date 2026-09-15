import fs from 'node:fs';
import path from 'node:path';

const appPath = path.resolve(process.cwd(), 'artifacts/coach-hudl/src/App.tsx');
let source = fs.readFileSync(appPath, 'utf8');

if (!source.includes("const SCOUT_ALL = 'ALL';")) {
  const marker = 'type Play = StandardPlay;\n';
  if (!source.includes(marker)) throw new Error('Could not find Play type marker in App.tsx');
  source = source.replace(marker, `${marker}\nconst SCOUT_ALL = 'ALL';\n`);
}

if (!source.includes('function optionsFor(')) {
  throw new Error('App.tsx is missing optionsFor; restore the Scout helper block before running this fix.');
}

fs.writeFileSync(appPath, source);
console.log('Scout helper definitions verified.');
