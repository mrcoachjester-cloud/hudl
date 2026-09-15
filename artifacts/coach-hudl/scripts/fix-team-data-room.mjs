import fs from 'node:fs';

const path = new URL('../src/App.tsx', import.meta.url);
let source = fs.readFileSync(path, 'utf8');

const scoutingImport = "import { getScoutingPlaysForTeam } from './lib/teamData';";
if (!source.includes(scoutingImport)) {
  const footballImport = "import { appendScoutingPlays, createGame, createScoutingSession, getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';";
  if (!source.includes(footballImport)) throw new Error('Could not locate the footballData import in App.tsx');
  source = source.replace(footballImport, `${footballImport}\n${scoutingImport}`, 1);
}

source = source.replace('const parsed = parseCsv(String(reader.result ?? \'\'));', 'const parsed = parseHudlCsv(String(reader.result ?? \'\'));');
if (!source.includes("import { parseHudlCsv } from './lib/hudlCsv';")) {
  const footballImport = "import { appendScoutingPlays, createGame, createScoutingSession, getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';";
  if (source.includes(footballImport)) source = source.replace(footballImport, `${footballImport}\nimport { parseHudlCsv } from './lib/hudlCsv';`, 1);
}

if (!source.includes('function UploadPage(') || !source.includes('Organize the opponent.')) {
  throw new Error('Expected the Data Room patch to be present in App.tsx. Refusing to overwrite the page.');
}

fs.writeFileSync(path, source);
console.log('Data Room Supabase dependency fix applied.');
