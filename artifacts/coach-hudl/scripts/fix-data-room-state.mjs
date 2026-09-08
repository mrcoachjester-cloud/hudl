import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(here, '../src/App.tsx');
let text = fs.readFileSync(appPath, 'utf8');

// Keep the Data Room state-isolated: new games start with zero live snaps.
const oldAddGame = `  const addGame = () => {\n    if (!draft.season.trim() || !draft.opponent.trim()) return;\n    const id = \`game-\${Date.now()}-\${draft.opponent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}\`;\n    const game: ScheduleGame = { ...draft, id, archived: false };\n    setData({ ...data, schedule: [game, ...schedule], activeGameId: id });\n    setDraft(current => ({ ...current, opponent: '', date: '', result: '—' }));\n  };`;

const newAddGame = `  const addGame = async () => {\n    if (!draft.season.trim() || !draft.opponent.trim()) return;\n\n    try {\n      let id = \`game-\${Date.now()}-\${draft.opponent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}\`;\n      if (isSupabaseConfigured) {\n        const seasons = await getSeasons();\n        const season = seasons.find(item => String(item.season_year) === draft.season.trim());\n        if (!season) throw new Error(\`Season \${draft.season} was not found in Supabase.\`);\n        const remoteGame = await createGame({\n          seasonId: season.id,\n          opponent: draft.opponent.trim(),\n          gameDate: draft.date || undefined,\n          location: draft.location,\n          result: draft.result,\n        });\n        if (!remoteGame) throw new Error('Supabase did not return the new game.');\n        id = remoteGame.id;\n      }\n\n      const game: ScheduleGame = { ...draft, id, archived: false };\n      const gameData = {\n        ...(data.gameData || {}),\n        [id]: { scouting: [], live: [] },\n      };\n      setData({\n        ...data,\n        schedule: [game, ...schedule],\n        activeGameId: id,\n        live: [],\n        gameData,\n      });\n      setDraft(current => ({ ...current, opponent: '', date: '', result: '—' }));\n    } catch (error) {\n      console.error('Could not save scheduled game:', error);\n      window.alert(error instanceof Error ? error.message : 'Could not save scheduled game.');\n    }\n  };`;

if (text.includes(oldAddGame)) text = text.replace(oldAddGame, newAddGame);

const oldImport = `import { isSupabaseConfigured } from './lib/supabase';`;
const newImport = `import { isSupabaseConfigured, supabase } from './lib/supabase';`;
if (text.includes(oldImport)) text = text.replace(oldImport, newImport);

// This must be structural, not an exact-order match. Other prebuild scripts
// may add/remove imports before this script runs.
const footballImportRegex = /import\s*\{([\s\S]*?)\}\s*from\s*['\"]\.\/lib\/footballData['\"];?/m;
const footballImportMatch = text.match(footballImportRegex);
if (footballImportMatch) {
  const names = footballImportMatch[1].split(',').map(item => item.trim()).filter(Boolean);
  if (!names.some(name => name === 'createGame')) {
    names.unshift('createGame');
    text = text.replace(footballImportRegex, `import { ${names.join(', ')} } from './lib/footballData';`);
  }
}

const marker = `function AppShell({ children, data, setData }: { children: ReactNode; data: Dataset; setData: (data: Dataset) => void }) {`;
const helpers = `async function insertLivePlay(gameId: string, play: Play) {\n  if (!supabase || !gameId) return;\n  const { error } = await supabase.from('plays').insert({\n    game_id: gameId, play_number: Number(play.playNo), odk: normalizeOdk(play.odk), down: Number(play.dn) || null, dist: Number(play.dist) || null,\n    hash: play.hash || null, gnls: Number(play.gnls) || 0, yard_line: Number(play.yardLn) || null, play_type: play.type || null, result: play.result || null,\n    off_formation: play.form || null, personnel: play.personnel || null, scheme: play.scheme || null, motion: play.motion || null, off_play: play.offPlay || null,\n    ball_carrier: play.carrier || null, defense: play.defense || null, play_dir: play.dir || null,\n  });\n  if (error) throw error;\n}\n\nasync function updateLivePlay(gameId: string, playNumber: number, play: Play) {\n  if (!supabase || !gameId) return;\n  const { error } = await supabase.from('plays').update({\n    odk: normalizeOdk(play.odk), down: Number(play.dn) || null, dist: Number(play.dist) || null, hash: play.hash || null, gnls: Number(play.gnls) || 0,\n    yard_line: Number(play.yardLn) || null, play_type: play.type || null, result: play.result || null, off_formation: play.form || null, personnel: play.personnel || null,\n    scheme: play.scheme || null, motion: play.motion || null, off_play: play.offPlay || null, ball_carrier: play.carrier || null, defense: play.defense || null, play_dir: play.dir || null,\n  }).eq('game_id', gameId).eq('play_number', playNumber);\n  if (error) throw error;\n}\n\nasync function deleteLivePlay(gameId: string, playNumber: number) {\n  if (!supabase || !gameId) return;\n  const { error } = await supabase.from('plays').delete().eq('game_id', gameId).eq('play_number', playNumber);\n  if (error) throw error;\n}\n\n`;
if (!text.includes('async function insertLivePlay(') && text.includes(marker)) text = text.replace(marker, helpers + marker);

const oldLiveAdd = `    setData(next);\n    setForm(current => ({ ...current, playNo: String(next.live.length + 1).padStart(2, '0'), yardLn: normalizedFormYardLine, gnls: '0', result: '' }));\n    toast.notify(\`Live snap added · GN/LS \${formatGnls(calculatedGnls)}\`);`;
const newLiveAdd = `    setData(next);\n    void insertLivePlay(data.activeGameId, next.live[next.live.length - 1]).catch(error => {\n      console.error('Could not save live snap:', error);\n      toast.notify('Snap added locally, but Supabase save failed');\n    });\n    setForm(current => ({ ...current, playNo: String(next.live.length + 1).padStart(2, '0'), yardLn: normalizedFormYardLine, gnls: '0', result: '' }));\n    toast.notify(\`Live snap added · GN/LS \${formatGnls(calculatedGnls)}\`);`;
if (text.includes(oldLiveAdd)) text = text.replace(oldLiveAdd, newLiveAdd);

const oldLiveImport = `      setData({ ...data, live: [...live, ...parsed] });\n      toast.notify(\`\${parsed.length} live snaps imported with yard-line gains\`);`;
const newLiveImport = `      const nextLive = [...live, ...parsed];\n      setData({ ...data, live: nextLive });\n      void Promise.all(parsed.map(play => insertLivePlay(data.activeGameId, play))).catch(error => {\n        console.error('Could not save imported live snaps:', error);\n        toast.notify('Imported locally, but Supabase save failed');\n      });\n      toast.notify(\`\${parsed.length} live snaps imported with yard-line gains\`);`;
if (text.includes(oldLiveImport)) text = text.replace(oldLiveImport, newLiveImport);

const oldEdit = `    setData({ ...data, live: recalculateLiveGains(nextLive, startingYardLine) });`;
const newEdit = `    const recalculated = recalculateLiveGains(nextLive, startingYardLine);\n    setData({ ...data, live: recalculated });\n    void updateLivePlay(data.activeGameId, Number(recalculated[actualIndex].playNo) || actualIndex + 1, recalculated[actualIndex]).catch(error => {\n      console.error('Could not update live snap:', error);\n      toast.notify('Snap updated locally, but Supabase update failed');\n    });`;
if (text.includes(oldEdit)) text = text.replace(oldEdit, newEdit);

const oldRemove = `    setData({ ...data, live: live.filter((_, index) => index !== actualIndex) });\n    toast.notify('Live snap removed');`;
const newRemove = `    const removedPlay = live[actualIndex];\n    setData({ ...data, live: live.filter((_, index) => index !== actualIndex) });\n    void deleteLivePlay(data.activeGameId, Number(removedPlay.playNo)).catch(error => {\n      console.error('Could not delete live snap:', error);\n      toast.notify('Snap removed locally, but Supabase delete failed');\n    });\n    toast.notify('Live snap removed');`;
if (text.includes(oldRemove)) text = text.replace(oldRemove, newRemove);

const oldChooseGame = `  const chooseGame = (id: string) => setData({ ...data, activeGameId: id });`;
const newChooseGame = `  const chooseGame = (id: string) => {\n    if (!id || id === data.activeGameId) return;\n    const gameData = {\n      ...(data.gameData || {}),\n      [data.activeGameId]: { scouting: data.gameData?.[data.activeGameId]?.scouting ?? [], live: data.live },\n    };\n    const target = gameData[id] ?? { scouting: [], live: [] };\n    setData({ ...data, activeGameId: id, scouting: data.scouting, live: target.live, gameData: { ...gameData, [id]: target } });\n  };`;
if (text.includes(oldChooseGame)) text = text.replace(oldChooseGame, newChooseGame);

const oldSelectGame = `    const targetPlays = gameData[gameId] ?? {\n      scouting: gameId === demoSchedule[0].id ? demoScouting : [],\n      live: [],\n    };`;
const newSelectGame = `    const targetPlays = gameData[gameId] ?? { scouting: [], live: [] };`;
if (text.includes(oldSelectGame)) text = text.replace(oldSelectGame, newSelectGame);

fs.writeFileSync(appPath, text);
console.log('Data Room isolation + Supabase persistence patch applied.');
