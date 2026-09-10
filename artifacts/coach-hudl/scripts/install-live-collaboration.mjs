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

if (!source.includes("import { isSupabaseConfigured, supabase } from './lib/supabase';")) {
  source = source.replace("import { isSupabaseConfigured } from './lib/supabase';", "import { isSupabaseConfigured, supabase } from './lib/supabase';");
}

function findMatchingParen(text, openIndex) {
  let depth = 0;
  let quote = null;
  for (let i = openIndex; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function findFunctionEnd(text, start) {
  const openParen = text.indexOf('(', start);
  if (openParen < 0) return -1;
  const closeParen = findMatchingParen(text, openParen);
  if (closeParen < 0) return -1;
  const brace = text.indexOf('{', closeParen);
  if (brace < 0) return -1;
  let depth = 0;
  let quote = null;
  for (let i = brace; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i + 1; }
  }
  return -1;
}

const matches = [...source.matchAll(/function\s+(LiveSpreadsheetPage|LivePage)\s*\(/g)];
if (!matches.length) throw new Error('Could not find Live Game component');

for (let n = matches.length - 1; n >= 0; n--) {
  const functionStart = matches[n].index;
  const openParen = source.indexOf('(', functionStart);
  const signatureClose = findMatchingParen(source, openParen);
  const functionEnd = findFunctionEnd(source, functionStart);
  if (openParen < 0 || signatureClose < 0 || functionEnd < 0) throw new Error('Could not determine Live Game component boundary');
  const signature = source.slice(functionStart, signatureClose + 1);
  if (!/\{[^}]*\bdata\b[^}]*\bsetData\b[^}]*\}/.test(signature)) continue;

  let section = source.slice(functionStart, functionEnd);
  const marker = 'LIVE_CROSS_APP_COLLAB_FINAL';
  if (section.includes(marker)) break;

  const effect = `\n  // ${marker}\n  const liveBroadcastRef = useRef<any>(null);\n  useEffect(() => {\n    if (!isSupabaseConfigured || !data.activeGameId || !supabase) return;\n    let cancelled = false;\n    const gameId = data.activeGameId;\n    const channel = supabase.channel('live-game-sync:' + gameId);\n    liveBroadcastRef.current = channel;\n    const refreshSaved = async () => {\n      try {\n        const remote = await getLivePlays(gameId);\n        if (!cancelled) setData({ ...data, live: remote.map(livePlayToStandard) });\n      } catch (error) { console.warn('Could not refresh shared Live Game plays:', error); }\n    };\n    channel\n      .on('broadcast', { event: 'live-draft' }, ({ payload }) => {\n        if (cancelled || !payload?.form) return;\n        setForm(payload.form as Play);\n        if (payload.startingYardLine !== undefined) setStartingYardLine(String(payload.startingYardLine));\n      })\n      .on('broadcast', { event: 'live-starting-yard-line' }, ({ payload }) => {\n        if (cancelled || payload?.value === undefined) return;\n        setStartingYardLine(String(payload.value));\n      })\n      .on('broadcast', { event: 'live-saved-refresh' }, () => { void refreshSaved(); })\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'plays', filter: 'game_id=eq.' + gameId }, () => { void refreshSaved(); })\n      .subscribe((status) => {\n        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('Live Game realtime channel status:', status);\n      });\n    void refreshSaved();\n    return () => { cancelled = true; if (liveBroadcastRef.current === channel) liveBroadcastRef.current = null; void supabase.removeChannel(channel); };\n  }, [data.activeGameId]);\n`;

  const existingV3 = section.indexOf('  // LIVE_SAVED_COLLABORATION_V3');
  const existingDraftMarker = section.indexOf('  // LIVE_DRAFT_UPDATE_V3');
  if (existingV3 >= 0 && existingDraftMarker > existingV3) {
    section = section.slice(0, existingV3) + effect.trimStart() + '\n' + section.slice(existingDraftMarker);
  } else {
    const bodyOpen = source.indexOf('{', signatureClose);
    const relativeBody = bodyOpen - functionStart + 1;
    section = section.slice(0, relativeBody) + effect + section.slice(relativeBody);
  }

  const updatePattern = /const update = \(key: keyof Play, value: string\) => setForm\(current => \(\{ \.\.\.current, \[key\]: value \}\)\);/;
  if (updatePattern.test(section)) {
    const replacement = `const update = (key: keyof Play, value: string) => {\n    const nextForm = { ...form, [key]: value };\n    setForm(nextForm);\n    if (isSupabaseConfigured && data.activeGameId) {\n      const send = liveBroadcastRef.current?.send({ type: 'broadcast', event: 'live-draft', payload: { form: nextForm, startingYardLine } });\n      void Promise.resolve(send)\n        .then(() => upsertLivePlayDraft(data.activeGameId, { ...nextForm, startingYardLine }, undefined))\n        .catch(error => console.warn('Could not broadcast Live Game draft:', error));\n    }\n  };`;
    section = section.replace(updatePattern, replacement);
  }

  const startingInputPattern = /onChange=\{event => setStartingYardLine\(event\.target\.value\)\}/;
  if (startingInputPattern.test(section)) {
    const helper = `const updateStartingYardLine = (value: string) => {\n    setStartingYardLine(value);\n    if (isSupabaseConfigured && data.activeGameId) {\n      const send = liveBroadcastRef.current?.send({ type: 'broadcast', event: 'live-starting-yard-line', payload: { value } });\n      void Promise.resolve(send)\n        .then(() => upsertLivePlayDraft(data.activeGameId, { ...form, startingYardLine: value }, undefined))\n        .catch(error => console.warn('Could not sync starting yard line:', error));\n    }\n  };\n  `;
    const markerIndex = section.indexOf('  // ' + marker);
    const insertAt = markerIndex >= 0 ? markerIndex : 0;
    section = section.slice(0, insertAt) + helper + section.slice(insertAt);
    section = section.replace(startingInputPattern, 'onChange={event => updateStartingYardLine(event.target.value)}');
  }

  // The Broadcast event is the authoritative low-latency draft sync. Listening to
  // our own Postgres draft changes causes a keystroke race: Supabase can echo the
  // just-written row back while the user is still typing a yard line, which makes
  // the controlled input appear to reset. Keep Postgres for persistence/recovery,
  // but do not feed draft row changes back into the live form.
  const draftRealtimePattern = /\n\s*\.on\('postgres_changes', \{ event: '\*', schema: 'public', table: 'live_play_drafts'[\s\S]*?\n\s*\}\)\n/;
  section = section.replace(draftRealtimePattern, '\n');

  source = source.slice(0, functionStart) + section + source.slice(functionEnd);
  break;
}

if (!source.includes('data-testid="select-global-game"')) {
  const teamSelectorEnd = /(<select\n\s*id="global-team"[\s\S]*?<\/select>\n\s*<\/div>)/;
  if (teamSelectorEnd.test(source)) {
    const gameBlock = `\n\n            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>\n              <label htmlFor="global-game" className="eyebrow" style={{ margin: 0 }}>\n                Game\n              </label>\n              <select\n                id="global-game"\n                value={data.activeGameId}\n                onChange={event => selectGame(event.target.value)}\n                style={{ minWidth: 180 }}\n                data-testid="select-global-game"\n              >\n                {seasonGames.map(game => (\n                  <option key={game.id} value={game.id}>{game.opponent} · {game.date}</option>\n                ))}\n              </select>\n            </div>`;
    source = source.replace(teamSelectorEnd, `$1${gameBlock}`);
  }
}

fs.writeFileSync(appPath, source);
console.log('Live Game cross-app collaboration installed with stable yard-line draft handling.');
