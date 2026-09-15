import fs from 'node:fs';

const appPath = new URL('../src/App.tsx', import.meta.url);
let source = fs.readFileSync(appPath, 'utf8');

function replaceOnce(from, to, label) {
  if (!source.includes(from)) {
    if (source.includes(to)) return;
    throw new Error(`Top team selector patch could not find ${label}`);
  }
  source = source.replace(from, to);
}

// Keep the selected team as first-class app context alongside the season/game.
replaceOnce(
  '  activeGameId: string;\n  gameData?: Record<string, { scouting: Play[]; live: Play[] }>;',
  '  activeGameId: string;\n  activeTeam?: string;\n  gameData?: Record<string, { scouting: Play[]; live: Play[] }>;',
  'Dataset activeTeam field'
);

replaceOnce(
  '      activeGameId,\n      gameData:',
  "      activeGameId,\n      activeTeam: typeof parsed.activeTeam === 'string' ? parsed.activeTeam : (schedule.find(game => game.id === activeGameId)?.opponent ?? ''),\n      gameData:",
  'safeLoad activeTeam'
);

replaceOnce(
  '  const activeGame = data.schedule.find(game => game.id === data.activeGameId) ?? data.schedule[0];\n\n  const seasons =',
  "  const activeGame = data.schedule.find(game => game.id === data.activeGameId) ?? data.schedule[0];\n  const [teamOptions, setTeamOptions] = useState<string[]>([]);\n  const activeTeam = data.activeTeam ?? activeGame?.opponent ?? '';\n\n  const seasons =",
  'AppShell team state'
);

replaceOnce(
  "  const seasonGames = data.schedule\n    .filter(game => game.season === activeSeason)\n    .sort((a, b) => a.date.localeCompare(b.date));\n\n  const selectGame = (gameId: string) => {",
  "  const seasonGames = data.schedule\n    .filter(game => game.season === activeSeason)\n    .sort((a, b) => a.date.localeCompare(b.date));\n\n  useEffect(() => {\n    const names = Array.from(new Set(seasonGames.map(game => game.opponent.trim()).filter(Boolean))).sort();\n    setTeamOptions(names);\n  }, [activeSeason, data.schedule]);\n\n  const selectTeam = async (team: string) => {\n    const normalizedTeam = team.trim();\n    if (!normalizedTeam) return;\n    const teamGame = seasonGames.find(game => game.opponent.trim().toLowerCase() === normalizedTeam.toLowerCase());\n    try {\n      const scouting = await getScoutingPlaysForTeam(activeSeason, normalizedTeam);\n      const live = teamGame ? (data.gameData?.[teamGame.id]?.live ?? []) : [];\n      setData({\n        ...data,\n        activeTeam: normalizedTeam,\n        activeGameId: teamGame?.id ?? data.activeGameId,\n        scouting,\n        live,\n      });\n    } catch (error) {\n      console.error('Could not load team scouting data:', error);\n      const live = teamGame ? (data.gameData?.[teamGame.id]?.live ?? []) : [];\n      setData({ ...data, activeTeam: normalizedTeam, activeGameId: teamGame?.id ?? data.activeGameId, live });\n    }\n  };\n\n  const selectGame = (gameId: string) => {",
  'team selection context'
);

const seasonSelectorEnd = /(<select\n\s*id="global-season"[\s\S]*?<\/select>\n\s*<\/div>)/;
if (!seasonSelectorEnd.test(source)) throw new Error('Top team selector patch could not find season selector');
source = source.replace(seasonSelectorEnd, `$1\n\n            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>\n              <label htmlFor="global-team" className="eyebrow" style={{ margin: 0 }}>\n                Team\n              </label>\n              <select\n                id="global-team"\n                value={activeTeam}\n                onChange={event => void selectTeam(event.target.value)}\n                style={{ minWidth: 150 }}\n                data-testid="select-global-team"\n              >\n                {!teamOptions.includes(activeTeam) && activeTeam && <option value={activeTeam}>{activeTeam}</option>}\n                {teamOptions.map(team => (\n                  <option key={team} value={team}>{team}</option>\n                ))}\n              </select>\n            </div>`);

fs.writeFileSync(appPath, source);
console.log('Restored top-level Season + Team selectors and made Team the global data context.');
