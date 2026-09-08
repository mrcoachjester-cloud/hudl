import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appPath = path.join(root, 'src', 'App.tsx');
let source = fs.readFileSync(appPath, 'utf8');

const importLine = "import { standardPlaysToHudlCsv, hudlCsvFilename } from './lib/hudlCsvExport';";
if (!source.includes(importLine)) {
  source = source.replace(
    "import { isSupabaseConfigured } from './lib/supabase';",
    "import { isSupabaseConfigured } from './lib/supabase';\n" + importLine,
  );
}

const component = `
function HudlCsvExportBar() {
  const [location] = useLocation();
  const [busy, setBusy] = useState(false);

  const route = location.split('?')[0];
  const isLive = route === '/live';
  const isDataRoom = route === '/scout' || route === '/reports';
  if (!isLive && !isDataRoom) return null;

  function exportHudlCsv(kind: 'live' | 'scouting') {
    setBusy(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('coach-hudl-datasets-v1');
      if (!raw) return;
      const data = JSON.parse(raw) as Dataset;
      const game = data.schedule?.find(item => item.id === data.activeGameId);
      const gameData = data.gameData?.[data.activeGameId];
      const plays = kind === 'live' ? (gameData?.live ?? data.live ?? []) : (gameData?.scouting ?? data.scouting ?? []);
      if (!plays.length) {
        window.alert(kind === 'live' ? 'There are no live plays to export yet.' : 'There are no Data Room plays to export yet.');
        return;
      }
      const prefix = game ? \\`${'${game.date || new Date().toISOString().slice(0, 10)}'}_${'${game.opponent || 'Game'}'}\\` : new Date().toISOString().slice(0, 10);
      download(hudlCsvFilename(prefix, kind === 'live' ? 'LiveGame' : 'DataRoom'), standardPlaysToHudlCsv(plays));
    } finally {
      window.setTimeout(() => setBusy(false), 250);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <button
        type="button"
        disabled={busy}
        onClick={() => exportHudlCsv(isLive ? 'live' : 'scouting')}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        title={isLive ? 'Export the current Live Game as Hudl CSV' : 'Export the current Data Room plays as Hudl CSV'}
      >
        <Download size={16} />
        {isLive ? 'Hudl CSV — Live Game' : 'Hudl CSV — Data Room'}
      </button>
    </div>
  );
}
`;

if (!source.includes('function HudlCsvExportBar()')) {
  const appMarker = /\n(?:export )?function App\s*\(/;
  if (!appMarker.test(source)) throw new Error('Could not find App component marker while installing Hudl CSV export.');
  source = source.replace(appMarker, `\n${component}\nfunction App(`);
}

if (!source.includes('<HudlCsvExportBar />')) {
  const appOpen = /(?:export )?function App\s*\([^)]*\)\s*\{\s*/;
  if (!appOpen.test(source)) throw new Error('Could not find App opening while installing Hudl CSV export.');
  source = source.replace(appOpen, match => `${match}  <HudlCsvExportBar />\n`);
}

fs.writeFileSync(appPath, source);
console.log('Installed Hudl CSV export controls for Live Game and Data Room.');
