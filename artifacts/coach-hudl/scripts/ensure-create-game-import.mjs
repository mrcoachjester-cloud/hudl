import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');
const dataPath = path.join(root, 'src', 'lib', 'footballData.ts');
if (!fs.existsSync(appPath) || !fs.existsSync(dataPath)) process.exit(0);

let appSource = fs.readFileSync(appPath, 'utf8');
const dataSource = fs.readFileSync(dataPath, 'utf8');

// The Schedule page calls createGame through the footballData module. Keep
// both sides of that contract explicit so a stale/generated bundle cannot
// ship an import for a missing export.
if (!/export\s+async\s+function\s+createGame\s*\(/.test(dataSource)) {
  throw new Error('footballData.ts must export async function createGame before building the app');
}

const importRegex = /import\s*\{([\s\S]*?)\}\s*from\s*['\"]\.\/lib\/footballData['\"];?/m;
const match = appSource.match(importRegex);
if (!match) throw new Error('Could not find footballData import in App.tsx');

const names = match[1]
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

if (!names.includes('createGame')) {
  names.unshift('createGame');
  appSource = appSource.replace(importRegex, `import { ${names.join(', ')} } from './lib/footballData';`);
  fs.writeFileSync(appPath, appSource);
  console.log('Ensured createGame is imported into App.tsx');
} else {
  console.log('createGame import already present');
}

// Always fail fast if the generated source still does not contain the named
// import. This prevents Vite from producing a runtime F.createGame error.
const finalImport = appSource.match(importRegex)?.[1] ?? '';
if (!finalImport.split(',').map(item => item.trim()).includes('createGame')) {
  throw new Error('createGame import was not present after the schedule import repair');
}
