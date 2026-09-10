import fs from 'node:fs';

const appPath = new URL('../src/App.tsx', import.meta.url);
const indexPath = new URL('../index.html', import.meta.url);
let source = fs.readFileSync(appPath, 'utf8');
let indexSource = fs.readFileSync(indexPath, 'utf8');

function replaceOnce(from, to, label) {
  if (!source.includes(from)) {
    if (source.includes(to)) return;
    throw new Error(`Team context patch could not find ${label}`);
  }
  source = source.replace(from, to);
}

const footballDataImport = /import \{[^\n]*\} from '\.\/lib\/footballData';/;
const teamDataImport = "import { getScoutingPlaysForTeam, getScoutingTeamNames } from './lib/teamData';";
if (!source.includes(teamDataImport)) {
  if (!footballDataImport.test(source)) throw new Error('Team context patch could not find footballData import');
  source = source.replace(footballDataImport, match => `${match}\n${teamDataImport}`);
}

// Support both the older formatted Dataset field and the current formatting.
const datasetField = /  activeGameId: string;\n  (?:activeTeam\?: string;\n  )?gameData\?: Record<string, \{ scouting: Play\[\]; live: Play\[\] \}>;|  activeGameId: string;\n  (?:activeTeam\?: string;\n  )?gameData\?: Record<string, \{ scouting: Play\[\]; live: Play\[\] \}> ;/;
if (!source.includes('  activeTeam?: string;')) {
  if (!datasetField.test(source)) throw new Error('Team context patch could not find Dataset team field');
  source = source.replace(datasetField, match => match.replace('  gameData?', '  activeTeam?: string;\n  gameData?'));
}

replaceOnce(
  "    return {\n      scouting: currentPlays.scouting,\n      live: currentPlays.live,\n      schedule,\n      activeGameId,\n      gameData:",
  "    return {\n      scouting: currentPlays.scouting,\n      live: currentPlays.live,\n      schedule,\n      activeGameId,\n      activeTeam: typeof parsed.activeTeam === 'string' ? parsed.activeTeam : (schedule.find(game => game.id === activeGameId)?.opponent ?? ''),\n      gameData:",
  'safeLoad active team'
);

replaceOnce(
  "  const activeGame = data.schedule.find(game => game.id === data.activeGameId) ?? data.schedule[0];\n\n  const seasons =",
  "  const activeGame = data.schedule.find(game => game.id === data.activeGameId) ?? data.schedule[0];\n  const [teamOptions, setTeamOptions] = useState<string[]>([]);\n  const activeTeam = activeGame?.opponent ?? data.activeTeam ?? '';\n\n  const seasons =",
  'AppShell team state'
);

replaceOnce(
  "  const seasonGames = data.schedule\n    .filter(game => game.season === activeSeason)\n    .sort((a, b) => a.date.localeCompare(b.date));\n\n  const selectGame = (gameId: string) => {",
  "  const seasonGames = data.schedule\n    .filter(game => game.season === activeSeason)\n    .sort((a, b) => a.date.localeCompare(b.date));\n\n  useEffect(() => {\n    const names = Array.from(new Set(seasonGames.map(game => game.opponent.trim()).filter(Boolean)));\n    setTeamOptions(names);\n  }, [activeSeason, data.schedule]);\n\n  const selectTeam = async (team: string) => {\n    const normalizedTeam = team.trim();\n    if (!normalizedTeam || normalizedTeam === activeTeam) return;\n    try {\n      const scouting = await getScoutingPlaysForTeam(activeSeason, normalizedTeam);\n      setData({ ...data, activeTeam: normalizedTeam, scouting });\n    } catch (error) {\n      console.error('Could not load scouting data for team:', error);\n      alert('Could not load scouting data for this team.');\n    }\n  };\n\n  useEffect(() => {\n    let cancelled = false;\n    if (!activeSeason || !activeTeam) return () => { cancelled = true; };\n    getScoutingPlaysForTeam(activeSeason, activeTeam)\n      .then(scouting => {\n        if (!cancelled && scouting.length) {\n          setData({ ...data, activeTeam, scouting });\n        }\n      })\n      .catch(error => {\n        console.warn('Could not hydrate scouting data from Supabase:', error);\n      });\n    return () => { cancelled = true; };\n  }, [activeSeason, activeTeam]);\n\n  const selectGame = (gameId: string) => {",
  'team loading and selector'
);

replaceOnce(
  "    setData({\n      ...data,\n      activeGameId: gameId,\n      scouting: targetPlays.scouting,\n      live: targetPlays.live,",
  "    setData({\n      ...data,\n      activeGameId: gameId,\n      activeTeam: data.activeTeam ?? activeGame?.opponent ?? '',\n      scouting: data.scouting,\n      live: targetPlays.live,",
  'game selection preserving scout team'
);

replaceOnce(
  "            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>\n              <label htmlFor=\"global-game\" className=\"eyebrow\" style={{ margin: 0 }}>",
  "            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>\n              <label htmlFor=\"global-team\" className=\"eyebrow\" style={{ margin: 0 }}>\n                Team\n              </label>\n              <select\n                id=\"global-team\"\n                value={activeTeam}\n                onChange={event => void selectTeam(event.target.value)}\n                style={{ minWidth: 150 }}\n                data-testid=\"select-global-team\"\n              >\n                {!teamOptions.includes(activeTeam) && activeTeam && <option value={activeTeam}>{activeTeam}</option>}\n                {teamOptions.map(team => (\n                  <option key={team} value={team}>{team}</option>\n                ))}\n              </select>\n            </div>\n\n            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>\n              <label htmlFor=\"global-game\" className=\"eyebrow\" style={{ margin: 0 }}>",
  'top Team selector'
);

source = source.replaceAll('Coach Hudl', 'Coach Connect');
source = source.replace(/(<div className=\"avatar\"[^>]*>\s*)JR(\s*<\/div>)/, '$1WHS$2');
indexSource = indexSource.replaceAll('Coach Hudl', 'Coach Connect');

fs.writeFileSync(appPath, source);
fs.writeFileSync(indexPath, indexSource);
console.log('Season + Team header context restored, scouting hydrated from Supabase on startup, and app rebranded as Coach Connect.');
