import fs from 'node:fs';
import path from 'node:path';

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
];

for (const file of [path.fileURLToPath(appPath), path.fileURLToPath(indexPath), ...walk(path.fileURLToPath(srcDir))]) {
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
if (source.includes('<CalendarClock') && !source.includes('CalendarClock,') && !source.includes('  CalendarClock,\n')) {
  source = source.replace('  BarChart3,\n', '  BarChart3,\n  CalendarClock,\n');
}

fs.writeFileSync(appPath, source);
console.log('Coach Connect branding sweep and Schedule upcoming-games quick view applied.');
