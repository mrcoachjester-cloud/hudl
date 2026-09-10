import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);
let source = fs.readFileSync(appPath, 'utf8');

const footballImportRegex = /import\s*\{([\s\S]*?)\}\s*from\s*['\"]\.\/lib\/footballData['\"];?/m;
const footballImport = source.match(footballImportRegex);
if (footballImport) {
  const required = ['clearLivePlayDraft', 'createLivePlay', 'deleteLivePlayByNumber', 'getLivePlayDraft', 'getLivePlays', 'liveDraftToStandard', 'livePlayToStandard', 'upsertLivePlayDraft', 'updateLivePlayByNumber'];
  let names = footballImport[1].split(',').map(item => item.trim()).filter(Boolean);
  for (const name of required) if (!names.includes(name)) names.push(name);
  source = source.replace(footballImportRegex, `import { ${names.join(', ')} } from './lib/footballData';`);
}

if (!source.includes("import { supabase } from './lib/supabase';")) {
  source = source.replace("import { isSupabaseConfigured } from './lib/supabase';", "import { isSupabaseConfigured, supabase } from './lib/supabase';");
}

const effectMarker = 'LIVE_SAVED_COLLABORATION_V2';
const effect = `\n  // LIVE_SAVED_COLLABORATION_V2\n  // One realtime channel carries both the current unsaved snap (draft) and\n  // committed plays. This lets multiple coaches chart the same game together.\n  useEffect(() => {\n    if (!isSupabaseConfigured || !data.activeGameId || !supabase) return;\n    let cancelled = false;\n    const gameId = data.activeGameId;\n    const refreshSaved = async () => {\n      try {\n        const remote = await getLivePlays(gameId);\n        if (!cancelled) setData({ ...data, live: remote.map(livePlayToStandard) });\n      } catch (error) { console.warn('Could not refresh shared Live Game plays:', error); }\n    };\n    const refreshDraft = async () => {\n      try {\n        const draft = await getLivePlayDraft(gameId);\n        if (!cancelled && draft) {\n          setForm(liveDraftToStandard(draft, startingYardLine));\n          if (draft.starting_yard_line !== null) setStartingYardLine(String(draft.starting_yard_line));\n        }\n      } catch (error) { console.warn('Could not refresh shared Live Game draft:', error); }\n    };\n    const channel = supabase.channel('live-game-sync:' + gameId)\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'plays', filter: 'game_id=eq.' + gameId }, () => { void refreshSaved(); })\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_play_drafts', filter: 'game_id=eq.' + gameId }, () => { void refreshDraft(); })\n      .subscribe();\n    void refreshSaved();\n    void refreshDraft();\n    return () => { cancelled = true; void supabase.removeChannel(channel); };\n  }, [data.activeGameId]);\n`;

function findFunctionEnd(text, start) {
  const brace = text.indexOf('{', start);
  if (brace < 0) return -1;
  let depth = 0;
  let quote = null;
  for (let i = brace; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i + 1; }
  }
  return -1;
}

const functionMatches = [...source.matchAll(/function\s+(LiveSpreadsheetPage|LivePage)\s*\(/g)];
if (!functionMatches.length) throw new Error('Could not find Live Game component');

for (let m = functionMatches.length - 1; m >= 0; m--) {
  const functionStart = m.index;
  const signatureClose = source.indexOf(')', functionStart);
  const functionEnd = findFunctionEnd(source, functionStart);
  if (signatureClose < 0 || functionEnd < 0) throw new Error('Could not determine Live Game component boundary');
  const signature = source.slice(functionStart, signatureClose + 1);

  if (!/\{[^}]*\bdata\b[^}]*\bsetData\b[^}]*\}/.test(signature)) continue;

  let section = source.slice(functionStart, functionEnd);
  if (!section.includes(effectMarker)) {
    const bodyStart = source.indexOf('{', signatureClose);
    const relativeBody = bodyStart - functionStart + 1;
    section = section.slice(0, relativeBody) + effect + section.slice(relativeBody);
  }

  const updatePattern = /const update = \(key: keyof Play, value: string\) => setForm\(current => \(\{ \.\.\.current, \[key\]: value \}\)\);/;
  if (updatePattern.test(section) && !section.includes('LIVE_DRAFT_UPDATE_V2')) {
    const replacement = `const update = (key: keyof Play, value: string) => {\n    const nextForm = { ...form, [key]: value };\n    setForm(nextForm);\n    if (isSupabaseConfigured && data.activeGameId) {\n      void upsertLivePlayDraft(data.activeGameId, nextForm, undefined)\n        .catch(error => console.warn('Could not broadcast Live Game draft:', error));\n    }\n  };\n  // LIVE_DRAFT_UPDATE_V2`;
    section = section.replace(updatePattern, replacement);
  }

  source = source.slice(0, functionStart) + section + source.slice(functionEnd);
}

fs.writeFileSync(appPath, source);
console.log('Live Game realtime collaboration installed for both unsaved drafts and saved plays.');
