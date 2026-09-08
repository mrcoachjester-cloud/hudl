import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');

if (!fs.existsSync(appPath)) process.exit(0);

let source = fs.readFileSync(appPath, 'utf8');

const importLine = "import LiveReportsPage from './ReportsHubPage';";
if (!source.includes(importLine)) {
  const marker = "import { isSupabaseConfigured } from './lib/supabase';";
  if (!source.includes(marker)) throw new Error('Reports patch: App.tsx import marker not found');
  source = source.replace(marker, `${marker}\n${importLine}`);
}

const route = '<Route path="/reports"><ReportsHubPage data={data} /></Route>';
const replacement = '<Route path="/reports"><LiveReportsPage data={data} /></Route>';
if (source.includes(route)) source = source.replace(route, replacement);

fs.writeFileSync(appPath, source);
console.log('Live reports page wired into /reports');
