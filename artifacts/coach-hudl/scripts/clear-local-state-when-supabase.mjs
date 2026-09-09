import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);

let source = fs.readFileSync(appPath, 'utf8');

const marker = "function safeLoad(): Dataset {\n  try {\n    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('coach-hudl-datasets-v1');";
const replacement = `function safeLoad(): Dataset {\n  try {\n    // Supabase is authoritative when configured. Do not resurrect schedule,\n    // scouting, or live data from the browser's old temporary dataset.\n    if (isSupabaseConfigured) {\n      localStorage.removeItem(STORAGE_KEY);\n      localStorage.removeItem('coach-hudl-datasets-v1');\n      return { scouting: [], live: [], schedule: [], activeGameId: '', gameData: {} };\n    }\n    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('coach-hudl-datasets-v1');`;

if (!source.includes(marker)) {
  throw new Error('Could not find safeLoad local-storage marker');
}
if (!source.includes('Supabase is authoritative when configured')) {
  source = source.replace(marker, replacement);
}

fs.writeFileSync(appPath, source);
console.log('Supabase configured: stale browser temporary dataset is cleared before app hydration.');
