import fs from 'node:fs';

const path = new URL('../src/App.tsx', import.meta.url);
let source = fs.readFileSync(path, 'utf8');

const footballImport = source.match(/import \{[^\n]*\} from '\.\/lib\/footballData';/);
if (!source.includes("import { parseHudlCsv } from './lib/hudlCsv';") && footballImport) {
  source = source.replace(footballImport[0], `${footballImport[0]}\nimport { parseHudlCsv } from './lib/hudlCsv';`);
}

if (source.includes('parseHudlCsv(') && !source.includes("from './lib/hudlCsv';")) {
  throw new Error('Hudl CSV parser is referenced but could not be imported.');
}

fs.writeFileSync(path, source);
console.log('Hudl CSV parser import verified.');
