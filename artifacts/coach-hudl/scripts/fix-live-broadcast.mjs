import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');
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
  if (section.includes('LIVE_CROSS_APP_BROADCAST_V1')) break;

  const oldEffectStart = section.indexOf('  // LIVE_SAVED_COLLABORATION_V3');
  const updateMarker = section.indexOf('  // LIVE_DRAFT_UPDATE_V3');
  if (oldEffectStart < 0 || updateMarker < 0) break;

  const effectEnd = section.indexOf('\n  // LIVE_DRAFT_UPDATE_V3', oldEffectStart);
  if (effectEnd < 0) break;

  const effect = `  // LIVE_SAVED_COLLABORATION_V3\n  // LIVE_CROSS_APP_BROADCAST_V1\n  useEffect(() => {\n    if (!isSupabaseConfigured || !data.activeGameId || !supabase) return;\n    let cancelled = false;\n    const gameId = data.activeGameId;\n    const channel = supabase.channel('live-game-sync:' + gameId);\n    const refreshSaved = async () => {\n      try {\n        const remote = await getLivePlays(gameId);\n        if (!cancelled) setData({ ...data, live: remote.map(livePlayToStandard) });\n      } catch (error) { console.warn('Could not refresh shared Live Game plays:', error); }\n    };\n    channel\n      .on('broadcast', { event: 'live-draft' }, ({ payload }) => {\n        if (cancelled || !payload?.form) return;\n        setForm(payload.form as Play);\n        if (payload.startingYardLine !== undefined) setStartingYardLine(String(payload.startingYardLine));\n      })\n      .on('broadcast', { event: 'live-saved-refresh' }, () => { void refreshSaved(); })\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'plays', filter: 'game_id=eq.' + gameId }, () => { void refreshSaved(); })\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_play_drafts', filter: 'game_id=eq.' + gameId }, (payload) => {\n        if (cancelled || payload.eventType === 'DELETE' || !payload.new) return;\n        const draft = payload.new;\n        setForm(liveDraftToStandard(draft, startingYardLine));\n        if (draft.starting_yard_line !== null && draft.starting_yard_line !== undefined) setStartingYardLine(String(draft.starting_yard_line));\n      })\n      .subscribe((status) => {\n        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('Live Game realtime channel status:', status);\n      });\n    void refreshSaved();\n    return () => { cancelled = true; void supabase.removeChannel(channel); };\n  }, [data.activeGameId]);`;

  section = section.slice(0, oldEffectStart) + effect + section.slice(effectEnd + 1);

  const marker = '  // LIVE_DRAFT_UPDATE_V3';
  const markerIndex = section.indexOf(marker);
  const nextLine = section.indexOf('\n', markerIndex);
  const updateBlockEnd = nextLine < 0 ? section.length : nextLine;
  const updateBlock = section.slice(markerIndex, Math.min(section.length, updateBlockEnd + 1));
  if (!updateBlock.includes("upsertLivePlayDraft(data.activeGameId, nextForm, undefined)")) break;
  const replacement = `  // LIVE_DRAFT_UPDATE_V3\n  // LIVE_CROSS_APP_DRAFT_SEND_V1`;
  section = section.replace(updateBlock, replacement);

  const updateRegex = /const update = \(key: keyof Play, value: string\) => \{[\s\S]*?\n  \};\n  \/\/ LIVE_DRAFT_UPDATE_V3/;
  const updateMatch = section.match(updateRegex);
  if (updateMatch) {
    const update = `const update = (key: keyof Play, value: string) => {\n    const nextForm = { ...form, [key]: value };\n    setForm(nextForm);\n    if (isSupabaseConfigured && data.activeGameId && supabase) {\n      const channel = supabase.channel('live-game-sync:' + data.activeGameId);\n      void upsertLivePlayDraft(data.activeGameId, nextForm, undefined)\n        .then(() => channel.send({ type: 'broadcast', event: 'live-draft', payload: { form: nextForm, startingYardLine } }))\n        .catch(error => console.warn('Could not broadcast Live Game draft:', error));\n    }\n  };\n  // LIVE_DRAFT_UPDATE_V3\n  // LIVE_CROSS_APP_DRAFT_SEND_V1`;
    section = section.replace(updateRegex, update);
  }

  source = source.slice(0, start) + section + source.slice(end);
  break;
}

fs.writeFileSync(appPath, source);
console.log('Live Game cross-app Broadcast sync installed.');
