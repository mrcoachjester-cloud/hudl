import fs from 'node:fs';

const path = new URL('../src/App.tsx', import.meta.url);
let source = fs.readFileSync(path, 'utf8');

const footballImport = /import \{[^\n]*\} from '\.\/lib\/footballData';/;
const desiredFootballImport = "import { appendScoutingPlays, createScoutingSession, getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';";
if (footballImport.test(source)) source = source.replace(footballImport, desiredFootballImport);
else source = desiredFootballImport + '\n' + source;

const hudlImport = "import { parseHudlCsv } from './lib/hudlCsv';";
if (!source.includes(hudlImport)) {
  const marker = "import { isSupabaseConfigured } from './lib/supabase';";
  if (source.includes(marker)) source = source.replace(marker, hudlImport + '\n' + marker);
  else source = hudlImport + '\n' + source;
}

if (source.includes('parseHudlCsv(') && !source.includes("from './lib/hudlCsv';")) {
  throw new Error('Hudl CSV parser is referenced but could not be imported.');
}
if (source.includes('createScoutingSession(') && !source.includes('createScoutingSession') ) {
  throw new Error('Scout session creator is referenced but could not be imported.');
}

fs.writeFileSync(path, source);
console.log('Hudl CSV and scout upload imports verified.');
