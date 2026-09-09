import fs from 'node:fs';
import path from 'node:path';

const appPath = path.join(path.resolve(process.cwd()), 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);
let source = fs.readFileSync(appPath, 'utf8');

const start = source.indexOf('  const removeLiveRow = (displayIndex: number) => {');
if (start < 0) throw new Error('Could not find Live Game removeLiveRow implementation');
const end = source.indexOf('\n  };', start);
if (end < 0) throw new Error('Could not determine Live Game removeLiveRow boundary');

const replacement = `  const removeLiveRow = (displayIndex: number) => {\n    const actualIndex = live.length - 1 - displayIndex;\n    const target = live[actualIndex];\n    setData({ ...data, live: live.filter((_, index) => index !== actualIndex) });\n    if (target && isSupabaseConfigured && supabase) {\n      void supabase.from('plays').delete().eq('game_id', data.activeGameId).eq('play_number', Number(target.playNo) || actualIndex + 1).then(({ error }) => {\n        if (error) console.warn('Could not delete live snap from Supabase:', error);\n      });\n    }\n    toast.notify('Live snap removed');\n  };`;

source = source.slice(0, start) + replacement + source.slice(end + 4);
fs.writeFileSync(appPath, source);
console.log('Live Game saved-play delete now removes the shared Supabase play, so every connected coach sees the deletion.');
