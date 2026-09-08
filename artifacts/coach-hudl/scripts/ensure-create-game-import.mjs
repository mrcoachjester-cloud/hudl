import fs from 'node:fs';
import path from 'node:path';

const appPath = path.resolve(process.cwd(), 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);

let source = fs.readFileSync(appPath, 'utf8');

// Some prebuild patches replace the footballData import. Always make the
// Supabase-backed schedule action available before Vite bundles the app.
const importRegex = /import\s*\{([\s\S]*?)\}\s*from\s*['\"]\.\/lib\/footballData['\"];?/m;
const match = source.match(importRegex);
if (!match) throw new Error('Could not find footballData import in App.tsx');

const names = match[1]
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

if (!names.some(name => name === 'createGame')) {
  names.unshift('createGame');
  source = source.replace(importRegex, `import { ${names.join(', ')} } from './lib/footballData';`);
  fs.writeFileSync(appPath, source);
  console.log('Ensured createGame is imported into App.tsx');
} else {
  console.log('createGame import already present');
}
