import fs from 'node:fs';

const path = new URL('../src/App.tsx', import.meta.url);
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(from, to, label) {
  if (!source.includes(from)) {
    if (source.includes(to)) return;
    throw new Error(`Team context patch could not find ${label}`);
  }
  source = source.replace(from, to);
}

if (!source.includes("from './lib/teamData';")) {
  const importMatch = source.match(/import \{[^\n]+\} from '\.\/lib\/footballData';/);
  if (!importMatch) throw new Error('Team context patch could not find footballData import');
  source = source.replace(importMatch[0], `${importMatch[0]}\nimport { getScoutingPlaysForTeam, getScoutingTeamNames } from './lib/teamData';`);
}

replaceOnce(
  "  activeGameId: string;\n  gameData?: Record<string, { scouting: Play[]; live: Play[] }>;",
  "  activeGameId: string;\n  activeTeam?: string;\n  gameData?: Record<string, { scouting: Play[]; live: Play[] }> ;",
  'Dataset team field'
);

replaceOnce(
  "    return {\n      scouting: currentPlays.scouting,\n      live: currentPlays.live,\n      schedule,\n      activeGameId,\n      gameData:",
  "    return {\n      scouting: currentPlays.scouting,\n      live: currentPlays.live,\n      schedule,\n      activeGameId,\n      activeTeam: typeof parsed.activeTeam === 'string' ? parsed.activeTeam : (schedule.find(game => game.id === activeGameId)?.opponent ?? ''),\n      gameData:",
  'safeLoad active team'
);

replaceOnce(
  "  const activeGame = data.schedule.find(game => game.id === data.activeGameId) ?? data.schedule[0];\n\n  const seasons =",
  "  const activeGame = data.schedule.find(game => game.id === data.activeGameId) ?? data.schedule[0];\n  const [teamOptions, setTeamOptions] = useState<string[]>([]);\n  const activeTeam = data.activeTeam ?? '';\n\n  const seasons =",
  'AppShell team state'
);

replaceOnce(
  "  const seasonGames = data.schedule\n    .filter(game => game.season === activeSeason)\n    .sort((a, b) => a.date.localeCompare(b.date));\n\n  const selectGame = (gameId: string) => {",
  "  const seasonGames = data.schedule\n    .filter(game => game.season === activeSeason)\n    .sort((a, b) => a.date.localeCompare(b.date));\n\n  useEffect(() => {\n    let cancelled = false;\n    if (!activeSeason) return () => { cancelled = true; };\n    getScoutingTeamNames(activeSeason)\n      .then(names => {\n        if (!cancelled) setTeamOptions(names.length ? names : Array.from(new Set(seasonGames.map(game => game.opponent).filter(Boolean))));\n      })\n      .catch(() => {\n        if (!cancelled) setTeamOptions(Array.from(new Set(seasonGames.map(game => game.opponent).filter(Boolean))));\n      });\n    return () => { cancelled = true; };\n  }, [activeSeason, seasonGames]);\n\n  const selectTeam = async (team: string) => {\n    const normalizedTeam = team.trim();\n    if (!normalizedTeam || normalizedTeam === activeTeam) return;\n    try {\n      const scouting = await getScoutingPlaysForTeam(activeSeason, normalizedTeam);\n      setData({ ...data, activeTeam: normalizedTeam, scouting });\n    } catch (error) {\n      console.error('Could not load scouting data for team:', error);\n      alert('Could not load scouting data for this team.');\n    }\n  };\n\n  const selectGame = (gameId: string) => {",
  'team loading and selector'
);

replaceOnce(
  "            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>\n              <label htmlFor=\"global-game\" className=\"eyebrow\" style={{ margin: 0 }}>",
  "            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>\n              <label htmlFor=\"global-team\" className=\"eyebrow\" style={{ margin: 0 }}>\n                Team\n              </label>\n              <select\n                id=\"global-team\"\n                value={activeTeam}\n                onChange={event => void selectTeam(event.target.value)}\n                style={{ minWidth: 150 }}\n                data-testid=\"select-global-team\"\n              >\n                {!teamOptions.includes(activeTeam) && activeTeam && <option value={activeTeam}>{activeTeam}</option>}\n                {teamOptions.map(team => (\n                  <option key={team} value={team}>{team}</option>\n                ))}\n              </select>\n            </div>\n\n            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>\n              <label htmlFor=\"global-game\" className=\"eyebrow\" style={{ margin: 0 }}>",
  'top Team selector'
);

fs.writeFileSync(path, source);
console.log('Season → Team → Game context patch applied.');
