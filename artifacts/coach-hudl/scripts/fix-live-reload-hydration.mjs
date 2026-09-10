import fs from 'node:fs';
import path from 'node:path';

const appPath = path.resolve(process.cwd(), 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);
let source = fs.readFileSync(appPath, 'utf8');

const oldBlock = `        const activeGameId =\n          schedule.find(game => !game.archived)?.id ??\n          schedule[0]?.id ??\n          '';`;
const newBlock = `        // Keep the game the coach was charting selected across a reload.\n        // If this device has no valid saved selection, fall back to the first active game.\n        let savedActiveGameId = '';\n        try {\n          const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('coach-hudl-datasets-v1');\n          if (stored) {\n            const parsed = JSON.parse(stored) as Partial<Dataset>;\n            if (typeof parsed.activeGameId === 'string') savedActiveGameId = parsed.activeGameId;\n          }\n        } catch {\n          savedActiveGameId = '';\n        }\n        const activeGameId =\n          schedule.some(game => game.id === savedActiveGameId)\n            ? savedActiveGameId\n            : schedule.find(game => !game.archived)?.id ??\n              schedule[0]?.id ??\n              '';`;
if (source.includes(oldBlock) && !source.includes('// Keep the game the coach was charting selected across a reload.')) {
  source = source.replace(oldBlock, newBlock);
}

// Never erase a locally cached Live board just because a reload-time Supabase read
// temporarily returns no rows. A successful non-empty remote read still wins.
const oldLiveAssignment = `              live: livePlays.length ? livePlays : current.live,`;
const newLiveAssignment = `              live: livePlays.length ? livePlays : (current.gameData?.[activeGameId]?.live ?? current.live),`;
source = source.replace(oldLiveAssignment, newLiveAssignment);

fs.writeFileSync(appPath, source);
console.log('Live reload hydration fixed: preserve active game and cached live rows during empty remote reads.');
