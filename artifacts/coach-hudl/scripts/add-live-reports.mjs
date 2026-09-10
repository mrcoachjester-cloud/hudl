import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');
const reportsPath = path.join(root, 'src', 'ReportsHubPage.tsx');

if (!fs.existsSync(appPath)) process.exit(0);

let source = fs.readFileSync(appPath, 'utf8');

// App.tsx uses createGame when adding a new schedule/game entry. Keep that
// function in the footballData import so recreating a deleted game works.
const footballDataImport = "import { getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';";
const footballDataImportWithCreateGame = "import { createGame, getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';";
if (source.includes(footballDataImport) && !source.includes('import { createGame,')) {
  source = source.replace(footballDataImport, footballDataImportWithCreateGame);
}

const importLine = "import LiveReportsPage from './ReportsHubPage';";
if (!source.includes(importLine)) {
  const imports = [...source.matchAll(/^import .*;$/gm)];
  if (!imports.length) throw new Error('Reports patch: App.tsx import block not found');
  const lastImport = imports[imports.length - 1];
  const insertAt = (lastImport.index ?? 0) + lastImport[0].length;
  source = source.slice(0, insertAt) + `\n${importLine}` + source.slice(insertAt);
}

// Always pass the persisted dataset directly. Do not create a module-level
// `const data` fallback: another transform may already declare that symbol,
// which would make the production bundle fail to compile.
const route = '<Route path="/reports"><ReportsHubPage data={data} /></Route>';
const legacyReplacement = '<Route path="/reports"><LiveReportsPage data={safeLoad()} /></Route>';
if (source.includes(route)) source = source.replace(route, legacyReplacement);

// Normalize any other generated Reports route that still references a free
// `data` identifier. This is intentionally limited to /reports and the reports
// components so unrelated component props are untouched.
const reportRouteDataPattern = /(<Route\s+path=["']\/reports["'][\s\S]{0,1200}?)data=\{data\}/g;
source = source.replace(reportRouteDataPattern, '$1data={safeLoad()}');
const reportComponentDataPattern = /(<(?:ReportsHubPage|LiveReportsPage)\b[^>]{0,1200}?)data=\{data\}/g;
source = source.replace(reportComponentDataPattern, '$1data={safeLoad()}');

// Reports need the same scouting board used by Overview. The scouting chart is
// from the opponent's perspective (Paschal O = Paschal offense), while Live
// Game is from our team's perspective (Paschal offense is charted as D).
// Load the matching scouting session for the active game and keep that source
// intact. ReportsHubPage then maps opponent O -> our DEFENSE comparison.
const oldLoader = `        let livePlays: Play[] = [];
        let scoutingPlays: Play[] = [];

        try {
          if (activeGameId) {
            const remoteLive = await getLivePlays(activeGameId);
            if (remoteLive.length > 0) {
              livePlays = remoteLive.map(livePlayToStandard);
            }
          }
        } catch (e) {
          console.warn('Could not fetch remote live plays:', e);
        }
`;

const newLoader = `        let livePlays: Play[] = [];
        let scoutingPlays: Play[] = [];

        try {
          if (activeGameId) {
            const remoteLive = await getLivePlays(activeGameId);
            if (remoteLive.length > 0) {
              livePlays = remoteLive.map(livePlayToStandard);
            }
          }
        } catch (e) {
          console.warn('Could not fetch remote live plays:', e);
        }

        try {
          const activeGame = games.find(game => game.id === activeGameId);
          if (activeGame) {
            const sessions = await getScoutingSessions(activeGame.season_id);
            const normalizedOpponent = activeGame.opponent.trim().toLowerCase();
            const session =
              sessions.find(item => item.game_id === activeGameId) ??
              sessions.find(item => item.opponent.trim().toLowerCase() === normalizedOpponent);

            if (session) {
              const remoteScout = await getScoutingPlays(session.id);
              if (remoteScout.length > 0) {
                scoutingPlays = remoteScout.map(scoutingPlayToStandard);
              }
            }
          }
        } catch (e) {
          console.warn('Could not fetch matching scouting data:', e);
        }
`;

if (source.includes(oldLoader)) {
  source = source.replace(oldLoader, newLoader);
} else if (!source.includes("const remoteScout = await getScoutingPlays(session.id);")) {
  throw new Error('Reports patch: Supabase play loader block not found');
}

// Never add a module-level `const data = safeLoad()` here. Reports routes are
// fixed at their call site instead, avoiding collisions with any existing data
// declaration produced by another build transform.

fs.writeFileSync(appPath, source);

if (fs.existsSync(reportsPath)) {
  let reports = fs.readFileSync(reportsPath, 'utf8');
  const oldPerspective = "const scout = scouting.filter(p=>odk(p.odk)==='D'), current = live.filter(p=>odk(p.odk)==='D');";
  const newPerspective = "const scout = scouting.filter(p=>odk(p.odk)==='O'), current = live.filter(p=>odk(p.odk)==='D');";
  if (reports.includes(oldPerspective)) {
    reports = reports.replace(oldPerspective, newPerspective);
  }
  fs.writeFileSync(reportsPath, reports);
}

console.log('Live reports wired to Supabase scouting with opponent-perspective O/D mapping');
