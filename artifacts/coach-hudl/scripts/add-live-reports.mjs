import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');
const reportsPath = path.join(root, 'src', 'ReportsHubPage.tsx');

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

fs.writeFileSync(appPath, source);

if (fs.existsSync(reportsPath)) {
  let reports = fs.readFileSync(reportsPath, 'utf8');
  // IMPORTANT: scouting O is the opponent offense. Live D is our defense.
  // Do not compare Live D against scouting D, because that would compare two
  // different football perspectives.
  const oldPerspective = "const scout = scouting.filter(p=>odk(p.odk)==='D'), current = live.filter(p=>odk(p.odk)==='D');";
  const newPerspective = "const scout = scouting.filter(p=>odk(p.odk)==='O'), current = live.filter(p=>odk(p.odk)==='D');";
  if (reports.includes(oldPerspective)) {
    reports = reports.replace(oldPerspective, newPerspective);
  }
  fs.writeFileSync(reportsPath, reports);
}

console.log('Live reports wired to Supabase scouting with opponent-perspective O/D mapping');
