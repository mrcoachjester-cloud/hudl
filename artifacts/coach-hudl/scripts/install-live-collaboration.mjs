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
  for (const name of required) if (!names.some(item => item === name)) names.push(name);
  source = source.replace(footballImportRegex, `import { ${names.join(', ')} } from './lib/footballData';`);
}

if (!source.includes("import { supabase } from './lib/supabase';")) {
  source = source.replace("import { isSupabaseConfigured } from './lib/supabase';", "import { isSupabaseConfigured, supabase } from './lib/supabase';");
}

const functionName = source.includes('function LiveSpreadsheetPage(') ? 'LiveSpreadsheetPage' : 'LivePage';
const signature = `function ${functionName}(`;
const functionStart = source.indexOf(signature);
if (functionStart < 0) throw new Error(`Could not find ${functionName} for live collaboration`);
const signatureClose = source.indexOf(')', functionStart);
const bodyStart = source.indexOf('{', signatureClose);
const functionEnd = source.indexOf('\nfunction ReportsHubPage', bodyStart);
if (bodyStart < 0 || functionEnd < 0) throw new Error(`Could not determine ${functionName} boundaries`);
let section = source.slice(functionStart, functionEnd);
const sectionBodyStart = bodyStart - functionStart;

const draftEffect = `\n  // LIVE_DRAFT_COLLABORATION: every coach shares the current unsaved snap.\n  useEffect(() => {\n    if (!isSupabaseConfigured || !data.activeGameId) return;\n    let cancelled = false;\n    const loadDraft = async () => {\n      try {\n        const draft = await getLivePlayDraft(data.activeGameId);\n        if (!draft || cancelled) return;\n        const previous = draft.starting_yard_line !== null ? String(draft.starting_yard_line) : startingYardLine;\n        if (draft.starting_yard_line !== null) setStartingYardLine(previous);\n        setForm(current => ({ ...current, ...liveDraftToStandard(draft, current.yardLn || previous) }));\n      } catch (error) { console.warn('Could not load shared Live Game draft:', error); }\n    };\n    void loadDraft();\n    const channel = supabase?.channel(\`live-draft:\${data.activeGameId}\`)\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_play_drafts', filter: \`game_id=eq.\${data.activeGameId}\` }, payload => {\n        if (payload.eventType === 'DELETE' || cancelled) return;\n        const draft = payload.new;\n        if (draft?.starting_yard_line !== null && draft?.starting_yard_line !== undefined) setStartingYardLine(String(draft.starting_yard_line));\n        if (draft) setForm(current => ({ ...current, ...liveDraftToStandard(draft, current.yardLn || startingYardLine) }));\n      })\n      .subscribe();\n    return () => { cancelled = true; if (channel && supabase) void supabase.removeChannel(channel); };\n  }, [data.activeGameId]);\n\n  // LIVE_SAVED_COLLABORATION: saved snaps are the shared source of truth.\n  useEffect(() => {\n    if (!isSupabaseConfigured || !data.activeGameId) return;\n    let cancelled = false;\n    const refreshSaved = async () => {\n      try {\n        const remote = await getLivePlays(data.activeGameId);\n        if (!cancelled) setData(current => ({ ...current, live: remote.map(livePlayToStandard) }));\n      } catch (error) { console.warn('Could not refresh shared Live Game plays:', error); }\n    };\n    const channel = supabase?.channel(\`live-plays:\${data.activeGameId}\`)\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'plays', filter: \`game_id=eq.\${data.activeGameId}\` }, () => { void refreshSaved(); })\n      .subscribe();\n    return () => { cancelled = true; if (channel && supabase) void supabase.removeChannel(channel); };\n  }, [data.activeGameId]);\n`;

if (!section.includes('LIVE_DRAFT_COLLABORATION')) {
  section = section.slice(0, sectionBodyStart + 1) + draftEffect + section.slice(sectionBodyStart + 1);
}

const updateRegex = /  const update = \(key: keyof Play, value: string\) =>[^\n]*;/;
if (updateRegex.test(section) && !section.includes('upsertLivePlayDraft(data.activeGameId')) {
  section = section.replace(updateRegex, `  const update = (key: keyof Play, value: string) => setForm(current => { const next = { ...current, [key]: value }; void upsertLivePlayDraft(data.activeGameId, next, window.sessionStorage.getItem('coach-connect-user') || undefined).catch(error => console.warn('Could not save shared Live Game draft:', error)); return next; });`);
}

const startingState = "const [startingYardLine, setStartingYardLine] = useState('-20');";
if (section.includes(startingState) && !section.includes('sharedStartingYardLine')) {
  section = section.replace(startingState, `${startingState}\n  const sharedStartingYardLine = (value: string) => { const normalized = normalizeYardLine(value); setStartingYardLine(normalized); void upsertLivePlayDraft(data.activeGameId, { playNo: String(data.live.length + 1).padStart(2, '0'), startingYardLine: normalized }, window.sessionStorage.getItem('coach-connect-user') || undefined).catch(error => console.warn('Could not save shared starting yard line:', error)); };`);
  section = section.replace("onChange={event => setStartingYardLine(event.target.value)} onBlur={() => setStartingYardLine(normalizeYardLine(startingYardLine))}", "onChange={event => sharedStartingYardLine(event.target.value)} onBlur={() => sharedStartingYardLine(startingYardLine)}");
}

// Replace Add Snap with a database-first transaction. The UI only says Saved after public.plays accepts the row.
function findFunctionEnd(text, start) {
  const brace = text.indexOf('{', start);
  if (brace < 0) return -1;
  let depth = 0;
  let quote = null;
  for (let i = brace; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\'') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '\\'' || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}
const addStart = section.indexOf('  const addPlay =');
if (addStart >= 0 && !section.includes('ADD_SNAP_DB_FIRST')) {
  const addEnd = findFunctionEnd(section, addStart);
  if (addEnd > addStart) {
    const replacement = `  // ADD_SNAP_DB_FIRST: persist first, then update the local spreadsheet.\n  const addPlay = async () => {\n    if (!data.activeGameId) { toast.notify('Select a scheduled game before adding a snap'); return; }\n    const normalizedYardLine = normalizeYardLine(form.yardLn || startingYardLine);\n    const calculated = recalculateLiveGains([...live, { ...form, yardLn: normalizedYardLine }], startingYardLine);\n    const nextPlay = calculated[calculated.length - 1];\n    try {\n      const saved = await createLivePlay(data.activeGameId, nextPlay);\n      if (!saved) throw new Error('Supabase did not return the saved play.');\n      const persisted = livePlayToStandard(saved);\n      const nextLive = [...live.filter(play => Number(play.playNo) !== Number(persisted.playNo)), persisted].sort((a, b) => Number(a.playNo) - Number(b.playNo));\n      setData({ ...data, live: nextLive });\n      await clearLivePlayDraft(data.activeGameId);\n      const resetYardLine = persisted.yardLn || normalizedYardLine;\n      setForm(current => ({ ...current, playNo: String(nextLive.length + 1).padStart(2, '0'), yardLn: resetYardLine, gnls: '0', result: '', form: '', offPlay: '', type: '', carrier: '', defense: '' }));\n      setStartingYardLine(resetYardLine);\n      toast.notify(\`Live snap saved · GN/LS \${formatGnls(num(persisted.gnls))}\`);\n    } catch (error) {\n      console.error('Could not save live snap to Supabase:', error);\n      toast.notify('Snap was NOT saved. Supabase rejected the snap.');\n    }\n  };\n`;
    section = section.slice(0, addStart) + replacement + section.slice(addEnd);
  }
}

const rowUpdate = /  const updateLiveRow = \(displayIndex: number, key: keyof Play, value: string\) => \{[\s\S]*?\n  \};/;
if (rowUpdate.test(section) && !section.includes('updateLivePlayByNumber(data.activeGameId')) {
  section = section.replace(rowUpdate, `  const updateLiveRow = (displayIndex: number, key: keyof Play, value: string) => {\n    const actualIndex = live.length - 1 - displayIndex;\n    const nextLive = live.map((play, index) => index === actualIndex ? { ...play, [key]: key === 'odk' ? normalizeOdk(value) : value } : play);\n    const recalculated = recalculateLiveGains(nextLive, startingYardLine);\n    setData({ ...data, live: recalculated });\n    const edited = recalculated[actualIndex];\n    if (edited) void updateLivePlayByNumber(data.activeGameId, Number(edited.playNo) || actualIndex + 1, edited).catch(error => console.warn('Could not save edited live snap:', error));\n  };`);
}

source = source.slice(0, functionStart) + section + source.slice(functionEnd);
fs.writeFileSync(appPath, source);
console.log('Live Game now uses Supabase as the saved-play source of truth, with shared unsaved drafts and collaborative saved-play edits.');