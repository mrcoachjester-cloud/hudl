import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');
const reportsPath = path.join(root, 'src', 'ReportsHubPage.tsx');

if (!fs.existsSync(appPath)) process.exit(0);

let source = fs.readFileSync(appPath, 'utf8');

const footballDataImport = "import { getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';";
const footballDataImportWithCreateGame = "import { createGame, getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';";
if (source.includes(footballDataImport) && !source.includes('import { createGame,')) {
  source = source.replace(footballDataImport, footballDataImportWithCreateGame);
}

// ReportsHubPage must receive the Router's live Dataset state. Never introduce
// a module-level `data`, safeLoad() prop, or global fallback here.
source = source.replace("import LiveReportsPage from './ReportsHubPage';\n", '');
source = source.replace(
  '<Route path="/reports"><LiveReportsPage data={safeLoad()} /></Route>',
  '<Route path="/reports"><ReportsHubPage data={data} /></Route>',
);
source = source.replace(
  '<Route path="/reports"><ReportsHubPage data={safeLoad()} /></Route>',
  '<Route path="/reports"><ReportsHubPage data={data} /></Route>',
);

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

fs.writeFileSync(appPath, source);

if (fs.existsSync(reportsPath)) {
  let reports = fs.readFileSync(reportsPath, 'utf8');
  const oldPerspective = "const scout = scouting.filter(p=>odk(p.odk)==='D'), current = live.filter(p=>odk(p.odk)==='D');";
  const newPerspective = "const scout = scouting.filter(p=>odk(p.odk)==='O'), current = live.filter(p=>odk(p.odk)==='D');";
  if (reports.includes(oldPerspective)) reports = reports.replace(oldPerspective, newPerspective);
  fs.writeFileSync(reportsPath, reports);
}

console.log('Live reports wired to Router state and Supabase scouting with opponent-perspective O/D mapping');
