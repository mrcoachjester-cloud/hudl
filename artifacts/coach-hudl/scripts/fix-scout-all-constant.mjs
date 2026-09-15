import fs from 'node:fs';

const appPath = new URL('../src/App.tsx', import.meta.url);
let source = fs.readFileSync(appPath, 'utf8');

if (!source.includes("const SCOUT_ALL")) {
  const marker = "type Play = StandardPlay;\n";
  if (!source.includes(marker)) throw new Error('Could not find Play type marker in App.tsx');
  source = source.replace(marker, `${marker}\nconst SCOUT_ALL = 'ALL';\n`);
  fs.writeFileSync(appPath, source);
  console.log('Added missing SCOUT_ALL constant.');
} else {
  console.log('SCOUT_ALL already defined.');
}
