import fs from 'node:fs';
import path from 'node:path';

const appPath = path.join(path.resolve(process.cwd()), 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);
let source = fs.readFileSync(appPath, 'utf8');

function findFunctionEnd(text, start) {
  const brace = text.indexOf('{', start);
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
if (!matches.length) process.exit(0);

for (let n = matches.length - 1; n >= 0; n--) {
  const start = matches[n].index;
  const end = findFunctionEnd(source, start);
  const close = source.indexOf(')', start);
  if (end < 0 || close < 0) continue;
  const signature = source.slice(start, close + 1);
  if (!/\{[^}]*\bdata\b[^}]*\bsetData\b[^}]*\}/.test(signature)) continue;

  let section = source.slice(start, end);
  if (section.includes('LIVE_CROSS_APP_BROADCAST_V2')) break;

  const oldStart = section.indexOf('  // LIVE_SAVED_COLLABORATION_V3');
  const oldEnd = section.indexOf('  // LIVE_DRAFT_UPDATE_V3', oldStart);
  if (oldStart < 0 || oldEnd < 0) break;
  const markerEnd = section.indexOf('\n', oldEnd);
  if (markerEnd < 0) break;

  const ref = `  const liveBroadcastRef = useRef<any>(null);\n`;
  const effect = `  // LIVE_SAVED_COLLABORATION_V3\n  // LIVE_CROSS_APP_BROADCAST_V2\n  useEffect(() => {\n    if (!isSupabaseConfigured || !data.activeGameId || !supabase) return;\n    let cancelled = false;\n    const gameId = data.activeGameId;\n    const channel = supabase.channel('live-game-sync:' + gameId);\n    liveBroadcastRef.current = channel;\n    const refreshSaved = async () => {\n      try {\n        const remote = await getLivePlays(gameId);\n        if (!cancelled) setData({ ...data, live: remote.map(livePlayToStandard) });\n      } catch (error) { console.warn('Could not refresh shared Live Game plays:', error); }\n    };\n    channel\n      .on('broadcast', { event: 'live-draft' }, ({ payload }) => {\n        if (cancelled || !payload?.form) return;\n        setForm(payload.form as Play);\n        if (payload.startingYardLine !== undefined) setStartingYardLine(String(payload.startingYardLine));\n      })\n      .on('broadcast', { event: 'live-saved-refresh' }, () => { void refreshSaved(); })\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'plays', filter: 'game_id=eq.' + gameId }, () => { void refreshSaved(); })\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_play_drafts', filter: 'game_id=eq.' + gameId }, (payload) => {\n        if (cancelled || payload.eventType === 'DELETE' || !payload.new) return;\n        const draft = payload.new;\n        setForm(liveDraftToStandard(draft, startingYardLine));\n        if (draft.starting_yard_line !== null && draft.starting_yard_line !== undefined) setStartingYardLine(String(draft.starting_yard_line));\n      })\n      .subscribe((status) => {\n        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('Live Game realtime channel status:', status);\n      });\n    void refreshSaved();\n    return () => { cancelled = true; if (liveBroadcastRef.current === channel) liveBroadcastRef.current = null; void supabase.removeChannel(channel); };\n  }, [data.activeGameId]);\n`;
  section = section.slice(0, oldStart) + ref + effect + section.slice(markerEnd + 1);

  const updateRegex = /const update = \(key: keyof Play, value: string\) => \{[\s\S]*?\n  \};\n  \/\/ LIVE_DRAFT_UPDATE_V3/;
  if (updateRegex.test(section)) {
    const update = `const update = (key: keyof Play, value: string) => {\n    const nextForm = { ...form, [key]: value };\n    setForm(nextForm);\n    if (isSupabaseConfigured && data.activeGameId) {\n      const send = liveBroadcastRef.current?.send({ type: 'broadcast', event: 'live-draft', payload: { form: nextForm, startingYardLine } });\n      void Promise.resolve(send)\n        .then(() => upsertLivePlayDraft(data.activeGameId, nextForm, undefined))\n        .catch(error => console.warn('Could not broadcast Live Game draft:', error));\n    }\n  };\n  // LIVE_DRAFT_UPDATE_V3\n  // LIVE_CROSS_APP_DRAFT_SEND_V2`;
    section = section.replace(updateRegex, update);
  }

  source = source.slice(0, start) + section + source.slice(end);
  break;
}

fs.writeFileSync(appPath, source);
console.log('Live Game Broadcast channel reuse installed.');
