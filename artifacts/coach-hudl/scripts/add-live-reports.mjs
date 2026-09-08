import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');

if (!fs.existsSync(appPath)) process.exit(0);

let source = fs.readFileSync(appPath, 'utf8');

const importLine = "import LiveReportsPage from './ReportsHubPage';";
if (!source.includes(importLine)) {
  // App.tsx has been patched by earlier prebuild scripts, so do not depend on
  // one exact import existing. Insert after the import block instead.
  const imports = [...source.matchAll(/^import .*;$/gm)];
  if (!imports.length) throw new Error('Reports patch: App.tsx import block not found');
  const lastImport = imports[imports.length - 1];
  const insertAt = (lastImport.index ?? 0) + lastImport[0].length;
  source = source.slice(0, insertAt) + `\n${importLine}` + source.slice(insertAt);
}

const route = '<Route path="/reports"><ReportsHubPage data={data} /></Route>';
const replacement = '<Route path="/reports"><LiveReportsPage data={data} /></Route>';
if (source.includes(route)) source = source.replace(route, replacement);

fs.writeFileSync(appPath, source);
console.log('Live reports page wired into /reports');
