import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const srcDir = new URL('./src/', root);
const appPath = new URL('./src/App.tsx', root);
const indexPath = new URL('./index.html', root);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(tsx?|jsx?|html|css|md)$/.test(entry.name)) files.push(full);
  }
  return files;
}

// Final pass: remove missed visible product-brand references without touching
// internal database keys, package names, storage keys, or the /artifacts/coach-hudl path.
const replacements = [
  [/Coach Hudl/g, 'Coach Connect'],
  [/coach hudl/g, 'coach connect'],
  [/CoachHudl/g, 'CoachConnect'],
  [/COACH HUDL/g, 'COACH CONNECT'],
  [/coach<span>hudl<\/span>/g, 'coach<span>connect</span>'],
];

for (const file of [fileURLToPath(appPath), fileURLToPath(indexPath), ...walk(fileURLToPath(srcDir))]) {
  let source = fs.readFileSync(file, 'utf8');
  const original = source;
  for (const [pattern, replacement] of replacements) source = source.replace(pattern, replacement);
  if (source !== original) fs.writeFileSync(file, source);
}

let source = fs.readFileSync(appPath, 'utf8');

// The sidebar brand mark is a product mark, not a coach/profile initial.
source = source.replace(
  /(<div className="brand-mark">)H(<\/div>)/,
  '$1CC$2'
);

// Schedule quick reference: show the next two non-archived games by date directly
// beneath the main schedule list. This uses schedule data only and does not depend
// on Live Game data.
const marker = '  const visibleGames = schedule.filter(game => showArchived || !game.archived);\n';
const computed = `  const today = new Date().toISOString().slice(0, 10);\n  const upcomingGames = schedule\n    .filter(game => !game.archived && game.date && game.date >= today)\n    .sort((a, b) => a.date.localeCompare(b.date))\n    .slice(0, 2);\n`;
if (!source.includes('const upcomingGames = schedule')) {
  if (!source.includes(marker)) throw new Error('Could not find SchedulePage game-list marker');
  source = source.replace(marker, marker + computed);
}

const scheduleListClose = '</div></Panel></div><div className="grid"><Panel><SectionTitle title="Active game"';
const quickView = `</div></Panel><Panel style={{ marginTop: 14 }}><SectionTitle title="Next 2 upcoming games" detail="Quick reference · schedule only" />{upcomingGames.length ? <div className="feed">{upcomingGames.map((game, index) => <button key={game.id} className="feed-row" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 0, color: 'inherit' }} onClick={() => chooseGame(game.id)} data-testid={\`button-upcoming-game-\${index}\`}><span className="feed-num">{index + 1}</span><div className="feed-main"><strong>{game.opponent}</strong><span>{game.date} · {game.location}{game.result && game.result !== '—' ? \` · \${game.result}\` : ''}</span></div><ChevronRight size={15} /></button>)}</div> : <div className="empty" style={{ padding: 18 }}><CalendarClock size={24} /><p style={{ margin: 0 }}>No upcoming games on the schedule.</p></div>}</Panel></div><div className="grid"><Panel><SectionTitle title="Active game"`;

if (!source.includes('Next 2 upcoming games')) {
  if (!source.includes(scheduleListClose)) throw new Error('Could not find SchedulePage schedule panel insertion point');
  source = source.replace(scheduleListClose, quickView);
}

// Add the icon used by the quick-reference empty state.
if (source.includes('<CalendarClock') && !source.includes('CalendarClock,')) {
  source = source.replace('  BarChart3,\n', '  BarChart3,\n  CalendarClock,\n');
}

// Schedule must be durable when Supabase is connected. Previously Add game only
// changed React/local state, while the app hydrates the schedule from Supabase on
// load. That made a newly-added opponent disappear after refresh/redeploy. Persist
// create/archive operations to the same games table used by the hydration query.
const footballDataImport = "import { getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';";
const footballDataImportWithArchive = "import { getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, setGameArchived, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';";
if (source.includes(footballDataImport) && !source.includes('setGameArchived')) {
  source = source.replace(footballDataImport, footballDataImportWithArchive);
}

const scheduleStateMarker = "function SchedulePage({ data, setData }: { data: Dataset; setData: (data: Dataset) => void }) {\n  const [draft, setDraft] = useState({ season: '2025', opponent: '', date: '', location: 'Home', result: '—' });";
const scheduleStateReplacement = "function SchedulePage({ data, setData }: { data: Dataset; setData: (data: Dataset) => void }) {\n  const schedule = data.schedule;\n  const activeGame = schedule.find(game => game.id === data.activeGameId) ?? schedule[0];\n  const [draft, setDraft] = useState({ season: activeGame?.season ?? String(new Date().getFullYear()), opponent: '', date: '', location: 'Home', result: '—' });\n  const [editingGameId, setEditingGameId] = useState<string | null>(null);\n  const toast = useToast();";
if (source.includes(scheduleStateMarker)) {
  source = source.replace(scheduleStateMarker, scheduleStateReplacement);
} else if (!source.includes('const toast = useToast();') || !source.includes("season: activeGame?.season")) {
  throw new Error('Could not find SchedulePage state marker');
}

// The original SchedulePage declares schedule/activeGame immediately after the draft.
// Remove that duplicate declaration after the state replacement above.
source = source.replace(
  "  const [showArchived, setShowArchived] = useState(false);\n  const schedule = data.schedule;\n  const activeGame = schedule.find(game => game.id === data.activeGameId) ?? schedule[0];\n  const seasons =",
  "  const [showArchived, setShowArchived] = useState(false);\n  const seasons ="
);

const localAddGame = `  const addGame = () => {\n    if (!draft.season.trim() || !draft.opponent.trim()) return;\n    const id = \`game-\${Date.now()}-\${draft.opponent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}\`;\n    const game: ScheduleGame = { ...draft, id, archived: false };\n    setData({ ...data, schedule: [game, ...schedule], activeGameId: id });\n    setDraft(current => ({ ...current, opponent: '', date: '', result: '—' }));\n  };`;
const persistedAddGame = `  const addGame = async () => {\n    if (!draft.season.trim() || !draft.opponent.trim()) return;\n    const seasonRecord = (await getSeasons()).find(item => String(item.season_year) === draft.season.trim());\n    if (isSupabaseConfigured) {\n      if (!seasonRecord) {\n        toast.notify(\`Season \${draft.season.trim()} was not found in Supabase.\`);\n        return;\n      }\n      try {\n        const created = await createGame({\n          seasonId: seasonRecord.id,\n          opponent: draft.opponent.trim(),\n          gameDate: draft.date || undefined,\n          location: draft.location,\n          result: draft.result,\n        });\n        if (!created) throw new Error('Supabase did not return the created game.');\n        const game: ScheduleGame = {\n          id: created.id,\n          season: String(seasonRecord.season_year),\n          opponent: created.opponent,\n          date: created.game_date ?? '',\n          location: created.location ?? '—',\n          result: created.game_result ?? '—',\n          archived: Boolean(created.archived),\n        };\n        setData({ ...data, schedule: [game, ...schedule], activeGameId: game.id });\n        setDraft(current => ({ ...current, opponent: '', date: '', result: '—' }));\n        toast.notify(\`Saved \${game.opponent} to the \${game.season} schedule.\`);\n      } catch (error) {\n        console.error('Could not save schedule game:', error);\n        toast.notify('Could not save that game to Supabase.');\n      }\n      return;\n    }\n    const id = \`game-\${Date.now()}-\${draft.opponent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}\`;\n    const game: ScheduleGame = { ...draft, id, archived: false };\n    setData({ ...data, schedule: [game, ...schedule], activeGameId: id });\n    setDraft(current => ({ ...current, opponent: '', date: '', result: '—' }));\n  };`;
if (source.includes(localAddGame)) {
  source = source.replace(localAddGame, persistedAddGame);
} else if (!source.includes("const seasonRecord = (await getSeasons()).find")) {
  throw new Error('Could not find SchedulePage addGame implementation');
}

// Add an edit mode that reuses the existing schedule form. Saving an edit updates
// the same Supabase game row, so changes survive refresh and do not affect Live Game data.
const addGameEndMarker = "  };\n\nconst localArchive";
const editBlock = `  };\n\n  const beginEditGame = (game: ScheduleGame) => {\n    setEditingGameId(game.id);\n    setDraft({ season: game.season, opponent: game.opponent, date: game.date || '', location: game.location === '—' ? 'Home' : game.location, result: game.result || '—' });\n  };\n\n  const cancelEditGame = () => {\n    setEditingGameId(null);\n    setDraft(current => ({ ...current, opponent: '', date: '', result: '—' }));\n  };\n\n  const saveScheduleGame = async () => {\n    if (!editingGameId) {\n      await addGame();\n      return;\n    }\n    if (!draft.season.trim() || !draft.opponent.trim()) return;\n    const target = schedule.find(game => game.id === editingGameId);\n    if (!target) return;\n    const seasonRecord = (await getSeasons()).find(item => String(item.season_year) === draft.season.trim());\n    if (isSupabaseConfigured) {\n      if (!seasonRecord) {\n        toast.notify(\`Season \${draft.season.trim()} was not found in Supabase.\`);\n        return;\n      }\n      try {\n        const { data: updated, error } = await supabase.from('games').update({\n          season_id: seasonRecord.id,\n          opponent: draft.opponent.trim(),\n          game_date: draft.date || null,\n          location: draft.location,\n          game_result: draft.result && draft.result !== '—' ? draft.result : null,\n        }).eq('id', editingGameId).select('*').single();\n        if (error) throw error;\n        if (!updated) throw new Error('Supabase did not return the updated game.');\n        const updatedGame: ScheduleGame = {\n          id: updated.id,\n          season: String(seasonRecord.season_year),\n          opponent: updated.opponent,\n          date: updated.game_date ?? '',\n          location: updated.location ?? '—',\n          result: updated.game_result ?? '—',\n          archived: Boolean(updated.archived),\n        };\n        setData({ ...data, schedule: schedule.map(game => game.id === editingGameId ? updatedGame : game), activeGameId: editingGameId });\n        setEditingGameId(null);\n        setDraft(current => ({ ...current, opponent: '', date: '', result: '—' }));\n        toast.notify(\`Updated \${updatedGame.opponent} on the \${updatedGame.season} schedule.\`);\n      } catch (error) {\n        console.error('Could not update schedule game:', error);\n        toast.notify('Could not update that game in Supabase.');\n      }\n      return;\n    }\n    const updatedGame: ScheduleGame = { ...target, season: draft.season.trim(), opponent: draft.opponent.trim(), date: draft.date, location: draft.location, result: draft.result };\n    setData({ ...data, schedule: schedule.map(game => game.id === editingGameId ? updatedGame : game), activeGameId: editingGameId });\n    setEditingGameId(null);\n    setDraft(current => ({ ...current, opponent: '', date: '', result: '—' }));\n  };\n\nconst localArchive`;
if (source.includes(addGameEndMarker)) {
  source = source.replace(addGameEndMarker, editBlock);
} else if (!source.includes('const saveScheduleGame = async')) {
  throw new Error('Could not find addGame boundary for schedule edit mode');
}

// The edit flow uses the same Supabase client already used by the app.
const supabaseImport = "import { isSupabaseConfigured } from './lib/supabase';";
if (source.includes(supabaseImport) && !source.includes("import { isSupabaseConfigured, supabase } from './lib/supabase';")) {
  source = source.replace(supabaseImport, "import { isSupabaseConfigured, supabase } from './lib/supabase';");
}

const localArchive = "  const toggleArchive = (id: string) => setData({ ...data, schedule: schedule.map(game => game.id === id ? { ...game, archived: !game.archived } : game) });";
const persistedArchive = `  const toggleArchive = async (id: string) => {\n    const target = schedule.find(game => game.id === id);\n    if (!target) return;\n    const archived = !target.archived;\n    if (isSupabaseConfigured) {\n      try {\n        const updated = await setGameArchived(id, archived);\n        if (!updated) throw new Error('Supabase did not return the updated game.');\n        setData({ ...data, schedule: schedule.map(game => game.id === id ? { ...game, archived } : game) });\n      } catch (error) {\n        console.error('Could not update schedule game archive state:', error);\n        toast.notify('Could not update that game in Supabase.');\n      }\n      return;\n    }\n    setData({ ...data, schedule: schedule.map(game => game.id === id ? { ...game, archived } : game) });\n  };`;
if (source.includes(localArchive)) {
  source = source.replace(localArchive, persistedArchive);
} else if (!source.includes('const archived = !target.archived')) {
  throw new Error('Could not find SchedulePage archive implementation');
}

// The schedule heading is for the active season; keep other seasons out of that
// list while preserving archived toggle behavior.
source = source.replace(
  "  const visibleGames = schedule.filter(game => showArchived || !game.archived);",
  "  const visibleGames = schedule.filter(game => game.season === activeGame?.season && (showArchived || !game.archived));"
);

// Reuse the existing form for both adding and editing. Add a Cancel action only in edit mode.
source = source.replace(
  "<button className=\"btn btn-primary\" onClick={addGame} disabled={!draft.season.trim() || !draft.opponent.trim()} data-testid=\"button-add-schedule-game\"><Plus /> Add game</button>",
  "<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className=\"btn btn-primary\" onClick={saveScheduleGame} disabled={!draft.season.trim() || !draft.opponent.trim()} data-testid=\"button-save-schedule-game\">{editingGameId ? <Check /> : <Plus />}{editingGameId ? ' Save changes' : ' Add game'}</button>{editingGameId && <button className=\"btn btn-ghost\" onClick={cancelEditGame} data-testid=\"button-cancel-schedule-edit\"><X /> Cancel</button>}</div>"
);

// Add an Edit action beside Archive/Restore for every schedule row.
const scheduleRowArchive = "<button className={`btn ${game.archived ? 'btn-ghost' : 'btn-danger'}`} onClick={() => toggleArchive(game.id)} data-testid={`button-archive-game-${game.id}`}>{game.archived ? 'Restore' : 'Archive'}</button>";
const scheduleRowActions = "<div style={{ display: 'flex', gap: 8 }}><button className=\"btn btn-ghost\" onClick={() => beginEditGame(game)} data-testid={`button-edit-game-${game.id}`}><Search /> Edit</button>" + scheduleRowArchive + "</div>";
if (source.includes(scheduleRowArchive) && !source.includes('button-edit-game-')) {
  source = source.replace(scheduleRowArchive, scheduleRowActions);
}

fs.writeFileSync(appPath, source);
console.log('Coach Connect branding, Schedule quick view, durable Supabase schedule persistence, and schedule editing applied.');
