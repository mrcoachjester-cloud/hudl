import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);

let source = fs.readFileSync(appPath, 'utf8');

const marker = "  const visibleGames = schedule.filter(game => showArchived || !game.archived);";
const replacement = `  const visibleGames = schedule\n    .filter(game => showArchived || !game.archived)\n    .slice()\n    .sort((a, b) => {\n      if (!a.date && !b.date) return 0;\n      if (!a.date) return 1;\n      if (!b.date) return -1;\n      return a.date.localeCompare(b.date);\n    });`;

if (!source.includes(marker)) {
  throw new Error('Could not find Schedule visibleGames implementation');
}

if (!source.includes("return a.date.localeCompare(b.date);")) {
  source = source.replace(marker, replacement);
  fs.writeFileSync(appPath, source);
  console.log('Schedule games now sort chronologically by game date.');
} else {
  console.log('Schedule date sorting already installed.');
}
