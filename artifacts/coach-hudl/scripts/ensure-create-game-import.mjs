import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');
const shimPath = path.join(root, 'src', 'lib', 'createGame.ts');
if (!fs.existsSync(appPath) || !fs.existsSync(shimPath)) process.exit(0);

let appSource = fs.readFileSync(appPath, 'utf8');

// Keep Schedule's createGame dependency isolated from the large footballData
// module. This gives the browser a concrete module export instead of relying
// on the generated namespace shape that previously produced F.createGame.
const importRegex = /import\s*\{([\s\S]*?)\}\s*from\s*['\"]\.\/lib\/footballData['\"];?/m;
const match = appSource.match(importRegex);
if (!match) throw new Error('Could not find footballData import in App.tsx');

const names = match[1]
  .split(',')
  .map(item => item.trim())
  .filter(Boolean)
  .filter(name => name !== 'createGame');

appSource = appSource.replace(importRegex, `import { ${names.join(', ')} } from './lib/footballData';`);

const shimImport = "import { createGame } from './lib/createGame';";
if (!appSource.includes(shimImport)) {
  const insertionPoint = appSource.indexOf('\n');
  appSource = `${appSource.slice(0, insertionPoint + 1)}${shimImport}\n${appSource.slice(insertionPoint + 1)}`;
}

fs.writeFileSync(appPath, appSource);
console.log('Schedule createGame now uses the dedicated createGame module');

const finalShimImport = appSource.includes(shimImport);
if (!finalShimImport) throw new Error('createGame shim import was not present after schedule import repair');
if (appSource.match(importRegex)?.[1].split(',').map(item => item.trim()).includes('createGame')) {
  throw new Error('createGame must not remain imported from footballData.ts');
}
