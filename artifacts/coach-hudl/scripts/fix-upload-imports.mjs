import fs from 'node:fs';

const path = new URL('../src/App.tsx', import.meta.url);
let source = fs.readFileSync(path, 'utf8');

const footballImport = /import\s*\{[^}]*\}\s*from\s*['"]\.\/lib\/footballData['"];?/;
const desiredFootballImport = "import { appendScoutingPlays, createScoutingSession, getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';";
if (footballImport.test(source)) source = source.replace(footballImport, desiredFootballImport);
else source = desiredFootballImport + '\n' + source;

const hudlImport = "import { parseHudlCsv } from './lib/hudlCsv';";
if (!source.includes(hudlImport)) {
  const marker = "import { isSupabaseConfigured } from './lib/supabase';";
  if (source.includes(marker)) source = source.replace(marker, hudlImport + '\n' + marker);
  else source = hudlImport + '\n' + source;
}

fs.writeFileSync(path, source);
console.log('Scout upload imports verified.');
