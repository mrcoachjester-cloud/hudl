import fs from 'node:fs';
import path from 'node:path';

const appPath = path.resolve(process.cwd(), 'artifacts/coach-hudl/src/App.tsx');
const source = fs.readFileSync(appPath, 'utf8');

if (!source.includes("const SCOUT_ALL = 'ALL';")) throw new Error('SCOUT_ALL is missing');
if (!source.includes('function optionsFor(')) throw new Error('optionsFor is missing from App.tsx; the existing source must be restored from a known-good Scout implementation before this script can run.');

console.log('Scout helpers are present.');
