import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);
let source = fs.readFileSync(appPath, 'utf8');

const oldOptions = "['Complete', 'Incomplete', 'Inside Zone +4', 'Outside Zone +8', 'First down', 'Touchdown', 'Sack', 'No gain']";
const resultOptions = "['Complete', 'Complete, TD', 'Fumble', 'Good', 'Incomplete', 'Interception', 'No Good', 'Penalty', 'Return', 'Rush', 'Rush, TD', 'Sack', 'Scramble', '2 Pt', 'Extra Pt', 'Punt', 'FG', 'Onside Kick', 'Pass']";
const occurrences = source.split(oldOptions).length - 1;
if (occurrences > 0) source = source.replaceAll(oldOptions, resultOptions);

const oldFormInit = "const [form, setForm] = useState<Play>({ ...demoScouting[0], playNo: String(data.live.length + 1).padStart(2, '0'), yardLn: data.live.at(-1)?.yardLn ?? '-22', result: '' });";
const newFormInit = "const [form, setForm] = useState<Play>({ ...demoScouting[0], playNo: String(data.live.length + 1).padStart(2, '0'), yardLn: data.live.at(-1)?.yardLn ?? '-22', form: '', offPlay: '', type: '', carrier: '', defense: '', result: '' });";
if (source.includes(oldFormInit)) source = source.replace(oldFormInit, newFormInit);

const oldField = "const field = (key: keyof Play, label: string, options?: string[]) => <div className=\"field\"><label htmlFor={`live-${key}`}>{label}</label>{options ? <select id={`live-${key}`} value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`select-live-${key}`}>{options.map(option => <option key={option}>{option}</option>)}</select> : <input id={`live-${key}`} className=\"input\" value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`input-live-${key}`} />}</div>;";
const newField = "const liveEditableValues = (key: keyof Play) => Array.from(new Set([...data.scouting.map(play => play[key]), ...data.live.map(play => play[key])].map(value => String(value ?? '').trim()).filter(value => value && value !== '—'))); const liveEditableField = (key: keyof Play, label: string) => { const values = liveEditableValues(key); const listId = `live-suggestions-${key}`; return <div className=\"field\"><label htmlFor={`live-${key}`}>{label}</label><input id={`live-${key}`} className=\"input\" list={values.length ? listId : undefined} value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`input-live-${key}`} />{values.length ? <datalist id={listId}>{values.map(value => <option key={value} value={value} />)}</datalist> : null}</div>; }; const field = (key: keyof Play, label: string, options?: string[]) => <div className=\"field\"><label htmlFor={`live-${key}`}>{label}</label>{options ? <select id={`live-${key}`} value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`select-live-${key}`}>{options.map(option => <option key={option}>{option}</option>)}</select> : <input id={`live-${key}`} className=\"input\" value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`input-live-${key}`} />}</div>;";
if (source.includes(oldField)) source = source.replace(oldField, newField);

const oldFormGrid = "<div className=\"form-grid\">{field('odk', 'ODK', ['O', 'D', 'K'])}{field('dn', 'Down', ['1', '2', '3', '4'])}{field('dist', 'Distance')}{field('hash', 'Hash', ['L', 'M', 'R'])}{yardLineField}{field('type', 'Play type', ['Run', 'Pass'])}{field('offPlay', 'Play call', ['IZ', 'OZ', 'GT Counter', 'Glance', 'Stick', 'Four Verticals', 'Other'])}{field('form', 'Formation', ['11 Personnel', '12 Personnel', 'Empty', 'Other'])}{field('carrier', 'Ball carrier')}<div className=\"field\"><label htmlFor=\"live-gnls\">GN/LS · calculated</label><output id=\"live-gnls\" className={`computed-value ${calculatedGnls !== null && calculatedGnls >= 0 ? 'positive' : calculatedGnls !== null ? 'negative' : ''}`} data-testid=\"output-live-gnls\">{formatGnls(calculatedGnls)}</output><span className=\"field-hint\">From {previousYardLine}</span></div>{field('result', 'Result', ['Complete', 'Complete, TD', 'Fumble', 'Good', 'Incomplete', 'Interception', 'No Good', 'Penalty', 'Return', 'Rush', 'Rush, TD', 'Sack', 'Scramble', '2 Pt', 'Extra Pt', 'Punt', 'FG', 'Onside Kick', 'Pass'])}{field('defense', 'Defense', ['4-2-5', '4-3', 'Nickel', 'Goal Line', 'Other'])}</div>";
const newFormGrid = "<div className=\"form-grid\">{field('odk', 'ODK', ['O', 'D', 'K'])}{field('dn', 'Down', ['1', '2', '3', '4'])}{field('dist', 'Distance')}{field('hash', 'Hash', ['L', 'M', 'R'])}{yardLineField}{liveEditableField('form', 'Formation')}{liveEditableField('offPlay', 'Play call')}{field('type', 'Play type')}{liveEditableField('carrier', 'Ball carrier')}{field('result', 'Result', ['Complete', 'Complete, TD', 'Fumble', 'Good', 'Incomplete', 'Interception', 'No Good', 'Penalty', 'Return', 'Rush', 'Rush, TD', 'Sack', 'Scramble', '2 Pt', 'Extra Pt', 'Punt', 'FG', 'Onside Kick', 'Pass'])}{liveEditableField('defense', 'Defense')}<div className=\"field\"><label htmlFor=\"live-gnls\">GN/LS · calculated</label><output id=\"live-gnls\" className={`computed-value ${calculatedGnls !== null && calculatedGnls >= 0 ? 'positive' : calculatedGnls !== null ? 'negative' : ''}`} data-testid=\"output-live-gnls\">{formatGnls(calculatedGnls)}</output><span className=\"field-hint\">From {previousYardLine}</span></div></div>";
if (source.includes(oldFormGrid)) source = source.replace(oldFormGrid, newFormGrid);

const oldHead = "<th>Play</th><th>ODK</th><th>Down</th><th>Distance</th><th>Type</th><th>Call</th><th>Formation</th><th>Ball carrier</th><th>Yard line</th><th>GN/LS</th><th>Result</th><th />";
const newHead = "<th>Play</th><th>ODK</th><th>Down</th><th>Distance</th><th>Yard line</th><th>Formation</th><th>Play Call</th><th>Play Type</th><th>Ball carrier</th><th>Result</th><th>Defense</th><th>GN/LS</th><th />";
if (source.includes(oldHead)) source = source.replace(oldHead, newHead);
const oldCells = "<td>{editCell(i, 'odk', play.odk, ['O', 'D', 'K'])}</td><td>{editCell(i, 'dn', play.dn, ['1', '2', '3', '4'])}</td><td>{editCell(i, 'dist', play.dist)}</td><td>{editCell(i, 'type', play.type, ['Run', 'Pass'])}</td><td>{editCell(i, 'offPlay', play.offPlay)}</td><td>{editCell(i, 'form', play.form)}</td><td>{editCell(i, 'carrier', play.carrier)}</td><td>{editCell(i, 'yardLn', play.yardLn)}</td><td className={num(play.gnls) >= 0 ? 'gain-positive' : 'gain-negative'}>{formatGnls(num(play.gnls))}</td><td>{editCell(i, 'result', play.result)}</td><td><button";
const newCells = "<td>{editCell(i, 'odk', play.odk, ['O', 'D', 'K'])}</td><td>{editCell(i, 'dn', play.dn, ['1', '2', '3', '4'])}</td><td>{editCell(i, 'dist', play.dist)}</td><td>{editCell(i, 'yardLn', play.yardLn)}</td><td>{editCell(i, 'form', play.form)}</td><td>{editCell(i, 'offPlay', play.offPlay)}</td><td>{editCell(i, 'type', play.type)}</td><td>{editCell(i, 'carrier', play.carrier)}</td><td>{editCell(i, 'result', play.result)}</td><td>{editCell(i, 'defense', play.defense)}</td><td className={num(play.gnls) >= 0 ? 'gain-positive' : 'gain-negative'}>{formatGnls(num(play.gnls))}</td><td><button";
if (source.includes(oldCells)) source = source.replace(oldCells, newCells);

const oldImport = "import { getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';";
const newImport = "import { createLivePlay, getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';";
if (source.includes(oldImport)) source = source.replace(oldImport, newImport);
const oldSupabaseImport = "import { isSupabaseConfigured } from './lib/supabase';";
const newSupabaseImport = "import { isSupabaseConfigured, supabase } from './lib/supabase';";
if (source.includes(oldSupabaseImport)) source = source.replace(oldSupabaseImport, newSupabaseImport);

// Realtime is installed in the actual spreadsheet component generated by the
// live-spreadsheet persistence patch. It refreshes from Supabase on every DB
// change, so two coaches see the same active game without refreshing.
if (!source.includes('LIVE_SPREADSHEET_REALTIME_INSTALLED')) {
  const start = source.indexOf('function LiveSpreadsheetPage(');
  const end = source.indexOf('function ReportsHubPage(', start);
  if (start >= 0 && end > start) {
    let section = source.slice(start, end);
    const anchor = 'function LiveSpreadsheetPage(';
    const openBrace = section.indexOf('{', section.indexOf(anchor));
    if (openBrace >= 0) {
      const effect = "\n  // LIVE_SPREADSHEET_REALTIME_INSTALLED: shared active game\n  useEffect(() => {\n    if (!isSupabaseConfigured || !data.activeGameId) return;\n    let cancelled = false;\n    const refresh = async () => { try { const rows = await getLivePlays(data.activeGameId); if (!cancelled) setData({ ...data, live: rows.map(livePlayToStandard) }); } catch {} };\n    refresh();\n    const channel = supabase?.channel(`live-game:${data.activeGameId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'plays', filter: `game_id=eq.${data.activeGameId}` }, refresh).subscribe();\n    return () => { cancelled = true; if (channel && supabase) void supabase.removeChannel(channel); };\n  }, [data.activeGameId]);\n";
      section = section.slice(0, openBrace + 1) + effect + section.slice(openBrace + 1);
      source = source.slice(0, start) + section + source.slice(end);
    }
  }
}

// Also support the legacy LivePage if it is the active route in an older build.
if (!source.includes('LIVE_REALTIME_INSTALLED')) {
  const liveStart = source.indexOf('function LivePage(');
  const liveEnd = source.indexOf('\nfunction ', liveStart + 12);
  if (liveStart >= 0 && liveEnd > liveStart) {
    let section = source.slice(liveStart, liveEnd);
    const openBrace = section.indexOf('{', section.indexOf('function LivePage('));
    if (openBrace >= 0) {
      const effect = "\n  // LIVE_REALTIME_INSTALLED: shared Live Game collaboration\n  useEffect(() => {\n    if (!isSupabaseConfigured || !data.activeGameId) return;\n    let cancelled = false;\n    const refresh = async () => { try { const rows = await getLivePlays(data.activeGameId); if (!cancelled) setData({ ...data, live: rows.map(livePlayToStandard) }); } catch {} };\n    refresh();\n    const channel = supabase?.channel(`live-game:${data.activeGameId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'plays', filter: `game_id=eq.${data.activeGameId}` }, refresh).subscribe();\n    return () => { cancelled = true; if (channel && supabase) void supabase.removeChannel(channel); };\n  }, [data.activeGameId]);\n";
      section = section.slice(0, openBrace + 1) + effect + section.slice(openBrace + 1);
      source = source.slice(0, liveStart) + section + source.slice(liveEnd);
    }
  }
}

// Deterministic final pass for the visible spreadsheet fields.
const liveStart2 = source.indexOf('function LiveSpreadsheetPage(');
const reportsStart = source.indexOf('function ReportsHubPage(', liveStart2);
if (liveStart2 >= 0 && reportsStart > liveStart2) {
  let liveSection = source.slice(liveStart2, reportsStart);
  liveSection = liveSection.replace(/const \[form, setForm\] = useState<Play>\(\{[\s\S]*?result: '' \}\);/, newFormInit);
  liveSection = liveSection.replace(/const field = \(key: keyof Play, label: string, options\?: string\[\]\) =>[\s\S]*?;\n  const yardLineField =/, `${newField}\n  const yardLineField =`);
  liveSection = liveSection.replace(/<div className=\"form-grid\">[\s\S]*?<\/div><div className=\"actions\" style=\{\{ marginTop: 17 \}\}>/, `${newFormGrid}<div className=\"actions\" style={{ marginTop: 17 }}>`);
  liveSection = liveSection.replace(/<thead><tr><th>Play<\/th>[\s\S]*?<\/tr><\/thead><tbody>\{live\.slice\(\)\.reverse\(\)\.map/, `<thead><tr>${newHead}</tr></thead><tbody>{live.slice().reverse().map`);
  liveSection = liveSection.replace(/<td>\{editCell\(i, 'odk',[\s\S]*?<td><button className=\"btn btn-danger\"/, newCells);
  source = source.slice(0, liveStart2) + liveSection + source.slice(reportsStart);
}

if (!source.includes("liveEditableField('form', 'Formation')")) throw new Error('Could not install Live Game scouting-driven fields');
if (!source.includes('<th>Formation</th><th>Play Call</th><th>Play Type</th>')) throw new Error('Could not reorder Live Game spreadsheet columns');
if (!source.includes("field('result', 'Result', ['Complete', 'Complete, TD', 'Fumble'")) throw new Error('Could not install Live Game result vocabulary');
fs.writeFileSync(appPath, source);
console.log(`Live Game UI and realtime collaboration configured${occurrences ? ` (${occurrences} Result field lists updated)` : ''}.`);
