import fs from 'node:fs';
import path from 'node:path';

const appPath = path.join(path.resolve(process.cwd()), 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);
let source = fs.readFileSync(appPath, 'utf8');
if (source.includes('data-testid="select-global-game"')) process.exit(0);

const teamSelectorEnd = /(<select\n\s*id="global-team"[\s\S]*?<\/select>\n\s*<\/div>)/;
if (!teamSelectorEnd.test(source)) process.exit(0);

const gameBlock = `\n\n            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>\n              <label htmlFor="global-game" className="eyebrow" style={{ margin: 0 }}>\n                Game\n              </label>\n              <select\n                id="global-game"\n                value={data.activeGameId}\n                onChange={event => selectGame(event.target.value)}\n                style={{ minWidth: 180 }}\n                data-testid="select-global-game"\n              >\n                {seasonGames.map(game => (\n                  <option key={game.id} value={game.id}>{game.opponent} · {game.date}</option>\n                ))}\n              </select>\n            </div>`;
source = source.replace(teamSelectorEnd, `$1${gameBlock}`);
fs.writeFileSync(appPath, source);
console.log('Global Game selector restored alongside Team selector.');
