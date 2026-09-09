import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);

let source = fs.readFileSync(appPath, 'utf8');

const oldOptions = "['Complete', 'Incomplete', 'Inside Zone +4', 'Outside Zone +8', 'First down', 'Touchdown', 'Sack', 'No gain']";
const resultOptions = "['Complete', 'Complete, TD', 'Fumble', 'Good', 'Incomplete', 'Interception', 'No Good', 'Penalty', 'Return', 'Rush', 'Rush, TD', 'Sack', 'Scramble', '2 Pt', 'Extra Pt', 'Punt', 'FG', 'Onside Kick', 'Pass']";

const occurrences = source.split(oldOptions).length - 1;
if (occurrences === 0) {
  if (source.includes("'Complete, TD'")) {
    console.log('Live Game Result vocabulary already installed.');
    process.exit(0);
  }
  throw new Error('Could not find Live Game Result option list');
}

source = source.replaceAll(oldOptions, resultOptions);
fs.writeFileSync(appPath, source);
console.log(`Installed controlled Result vocabulary in ${occurrences} Live Game field(s).`);
