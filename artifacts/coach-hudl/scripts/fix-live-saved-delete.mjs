import fs from 'node:fs';
import path from 'node:path';

const appPath = path.join(path.resolve(process.cwd()), 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);
let source = fs.readFileSync(appPath, 'utf8');

// set-result-vocabulary.mjs generates the Live Game editable-field JSX from a
// JavaScript string. Repair escaped JSX attribute quotes before Vite parses the
// generated App.tsx. Without this, Vite sees className=\"...\" as malformed JSX.
source = source.replace(/=\\\"([^\"]*)\\\"/g, '=\"$1\"');

const start = source.indexOf('  const removeLiveRow = (displayIndex: number) => {');
if (start < 0) throw new Error('Could not find Live Game removeLiveRow implementation');
const end = source.indexOf('\n  };', start);
if (end < 0) throw new Error('Could not determine Live Game removeLiveRow boundary');

const replacement = `  const removeLiveRow = (displayIndex: number) => {
    const actualIndex = live.length - 1 - displayIndex;
    const target = live[actualIndex];
    setData({ ...data, live: live.filter((_, index) => index !== actualIndex) });
    if (target && isSupabaseConfigured && supabase) {
      void supabase.from('plays').delete().eq('game_id', data.activeGameId).eq('play_number', Number(target.playNo) || actualIndex + 1).then(({ error }) => {
        if (error) console.warn('Could not delete live snap from Supabase:', error);
      });
    }
    toast.notify('Live snap removed');
  };`;

source = source.slice(0, start) + replacement + source.slice(end + 4);
fs.writeFileSync(appPath, source);
console.log('Live Game saved-play delete now removes the shared Supabase play, and generated JSX attribute escaping is repaired before Vite.');
