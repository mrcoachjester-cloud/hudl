import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);

let source = fs.readFileSync(appPath, 'utf8');

// This script runs after several other Schedule patches. Do not depend on the
// exact expression those patches leave behind. Replace the visibleGames
// declaration itself, from its declaration through its terminating semicolon.
const visibleGamesRegex = /  const visibleGames =[^;]*;\n/;
const replacement = `  const visibleGames = schedule
    .filter(game => game.season === activeGame?.season && (showArchived || !game.archived))
    .slice()
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
`;

if (source.includes("return a.date.localeCompare(b.date);")) {
  console.log('Schedule date sorting already installed.');
  process.exit(0);
}

if (!visibleGamesRegex.test(source)) {
  throw new Error('Could not find Schedule visibleGames declaration');
}

source = source.replace(visibleGamesRegex, replacement);
fs.writeFileSync(appPath, source);
console.log('Schedule games now sort chronologically by game date.');
