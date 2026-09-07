import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(here, '../src/App.tsx');
let text = fs.readFileSync(appPath, 'utf8');

const oldAddGame = `  const addGame = () => {
    if (!draft.season.trim() || !draft.opponent.trim()) return;
    const id = \`game-\${Date.now()}-\${draft.opponent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}\`;
    const game: ScheduleGame = { ...draft, id, archived: false };
    setData({ ...data, schedule: [game, ...schedule], activeGameId: id });
    setDraft(current => ({ ...current, opponent: '', date: '', result: '—' }));
  };`;

const newAddGame = `  const addGame = () => {
    if (!draft.season.trim() || !draft.opponent.trim()) return;
    const id = \`game-\${Date.now()}-\${draft.opponent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}\`;
    const game: ScheduleGame = { ...draft, id, archived: false };
    const gameData = {
      ...(data.gameData || {}),
      [id]: { scouting: [], live: [] },
    };
    // A new scheduled event is a brand-new Live Game. Never carry the
    // previous game's live snaps into it. Scout data remains independent.
    setData({
      ...data,
      schedule: [game, ...schedule],
      activeGameId: id,
      live: [],
      gameData,
    });
    setDraft(current => ({ ...current, opponent: '', date: '', result: '—' }));
  };`;

if (!text.includes(oldAddGame)) {
  throw new Error('Expected SchedulePage.addGame block was not found');
}
text = text.replace(oldAddGame, newAddGame);

const oldChooseGame = `  const chooseGame = (id: string) => setData({ ...data, activeGameId: id });`;
const newChooseGame = `  const chooseGame = (id: string) => {
    if (!id || id === data.activeGameId) return;
    const gameData = {
      ...(data.gameData || {}),
      [data.activeGameId]: {
        scouting: data.gameData?.[data.activeGameId]?.scouting ?? [],
        live: data.live,
      },
    };
    const target = gameData[id] ?? { scouting: [], live: [] };
    setData({
      ...data,
      activeGameId: id,
      // Scout files are independent of the selected scheduled game.
      scouting: data.scouting,
      live: target.live,
      gameData: { ...gameData, [id]: target },
    });
  };`;

if (text.includes(oldChooseGame)) {
  text = text.replace(oldChooseGame, newChooseGame);
}

const oldSelectGame = `    const targetPlays = gameData[gameId] ?? {
      scouting: gameId === demoSchedule[0].id ? demoScouting : [],
      live: [],
    };`;
const newSelectGame = `    const targetPlays = gameData[gameId] ?? {
      scouting: [],
      live: [],
    };`;
if (text.includes(oldSelectGame)) {
  text = text.replace(oldSelectGame, newSelectGame);
}

fs.writeFileSync(appPath, text);
console.log('Data Room state isolation patch applied.');
