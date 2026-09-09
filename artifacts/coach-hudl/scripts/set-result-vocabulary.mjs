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

// Live Game starts with only ODK/Down/Dist/Hash/Yard Line carried forward.
// Formation, Play Call, Ball Carrier, and Defense are blank but editable, with
// suggestions drawn from this game's scouting and live entries.
const oldFormInit = "const [form, setForm] = useState<Play>({ ...demoScouting[0], playNo: String(data.live.length + 1).padStart(2, '0'), yardLn: data.live.at(-1)?.yardLn ?? '-22', result: '' });";
const newFormInit = "const [form, setForm] = useState<Play>({ ...demoScouting[0], playNo: String(data.live.length + 1).padStart(2, '0'), yardLn: data.live.at(-1)?.yardLn ?? '-22', form: '', offPlay: '', carrier: '', defense: '', result: '' });";
if (source.includes(oldFormInit)) source = source.replace(oldFormInit, newFormInit);

const oldField = "const field = (key: keyof Play, label: string, options?: string[]) => <div className=\"field\"><label htmlFor={`live-${key}`}>{label}</label>{options ? <select id={`live-${key}`} value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`select-live-${key}`}>{options.map(option => <option key={option}>{option}</option>)}</select> : <input id={`live-${key}`} className=\"input\" value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`input-live-${key}`} />}</div>;";
const newField = "const suggestionValues = (key: keyof Play) => Array.from(new Set([...data.scouting.map(play => play[key]), ...data.live.map(play => play[key])].map(value => String(value ?? '').trim()).filter(Boolean))); const editableField = (key: keyof Play, label: string) => { const suggestions = suggestionValues(key); const listId = `live-suggestions-${key}`; return <div className=\"field\"><label htmlFor={`live-${key}`}>{label}</label><input id={`live-${key}`} className=\"input\" list={suggestions.length ? listId : undefined} value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`input-live-${key}`} />{suggestions.length ? <datalist id={listId}>{suggestions.map(option => <option key={option} value={option} />)}</datalist> : null}</div>; }; const field = (key: keyof Play, label: string, options?: string[]) => <div className=\"field\"><label htmlFor={`live-${key}`}>{label}</label>{options ? <select id={`live-${key}`} value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`select-live-${key}`}>{options.map(option => <option key={option}>{option}</option>)}</select> : <input id={`live-${key}`} className=\"input\" value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`input-live-${key}`} />}</div>;";
if (source.includes(oldField)) source = source.replace(oldField, newField);

const oldFormGrid = "<div className=\"form-grid\">{field('odk', 'ODK', ['O', 'D', 'K'])}{field('dn', 'Down', ['1', '2', '3', '4'])}{field('dist', 'Distance')}{field('hash', 'Hash', ['L', 'M', 'R'])}{yardLineField}{field('type', 'Play type', ['Run', 'Pass'])}{field('offPlay', 'Play call', ['IZ', 'OZ', 'GT Counter', 'Glance', 'Stick', 'Four Verticals', 'Other'])}{field('form', 'Formation', ['11 Personnel', '12 Personnel', 'Empty', 'Other'])}{field('carrier', 'Ball carrier')}<div className=\"field\"><label htmlFor=\"live-gnls\">GN/LS · calculated</label><output id=\"live-gnls\" className={`computed-value ${calculatedGnls !== null && calculatedGnls >= 0 ? 'positive' : calculatedGnls !== null ? 'negative' : ''}`} data-testid=\"output-live-gnls\">{formatGnls(calculatedGnls)}</output><span className=\"field-hint\">From {previousYardLine}</span></div>{field('result', 'Result', ['Complete', 'Complete, TD', 'Fumble', 'Good', 'Incomplete', 'Interception', 'No Good', 'Penalty', 'Return', 'Rush', 'Rush, TD', 'Sack', 'Scramble', '2 Pt', 'Extra Pt', 'Punt', 'FG', 'Onside Kick', 'Pass'])}{field('defense', 'Defense', ['4-2-5', '4-3', 'Nickel', 'Goal Line', 'Other'])}</div>";
const newFormGrid = "<div className=\"form-grid\">{field('odk', 'ODK', ['O', 'D', 'K'])}{field('dn', 'Down', ['1', '2', '3', '4'])}{field('dist', 'Distance')}{field('hash', 'Hash', ['L', 'M', 'R'])}{yardLineField}{editableField('form', 'Formation')}{editableField('offPlay', 'Play call')}{field('type', 'Play type', ['Run', 'Pass'])}{editableField('carrier', 'Ball carrier')}{field('result', 'Result', ['Complete', 'Complete, TD', 'Fumble', 'Good', 'Incomplete', 'Interception', 'No Good', 'Penalty', 'Return', 'Rush', 'Rush, TD', 'Sack', 'Scramble', '2 Pt', 'Extra Pt', 'Punt', 'FG', 'Onside Kick', 'Pass'])}{editableField('defense', 'Defense')}<div className=\"field\"><label htmlFor=\"live-gnls\">GN/LS · calculated</label><output id=\"live-gnls\" className={`computed-value ${calculatedGnls !== null && calculatedGnls >= 0 ? 'positive' : calculatedGnls !== null ? 'negative' : ''}`} data-testid=\"output-live-gnls\">{formatGnls(calculatedGnls)}</output><span className=\"field-hint\">From {previousYardLine}</span></div></div>";
if (source.includes(oldFormGrid)) source = source.replace(oldFormGrid, newFormGrid);

// Keep the spreadsheet in the same requested order.
const oldHead = "<th>Play</th><th>ODK</th><th>Down</th><th>Distance</th><th>Type</th><th>Call</th><th>Formation</th><th>Ball carrier</th><th>Yard line</th><th>GN/LS</th><th>Result</th>";
const newHead = "<th>Play</th><th>ODK</th><th>Down</th><th>Distance</th><th>Yard line</th><th>Formation</th><th>Play Call</th><th>Play Type</th><th>Ball carrier</th><th>Result</th><th>Defense</th><th>GN/LS</th>";
if (source.includes(oldHead)) source = source.replace(oldHead, newHead);

const oldCells = "<td>{editCell(i, 'odk', play.odk, ['O', 'D', 'K'])}</td><td>{editCell(i, 'dn', play.dn, ['1', '2', '3', '4'])}</td><td>{editCell(i, 'dist', play.dist)}</td><td>{editCell(i, 'type', play.type, ['Run', 'Pass'])}</td><td>{editCell(i, 'offPlay', play.offPlay)}</td><td>{editCell(i, 'form', play.form)}</td><td>{editCell(i, 'carrier', play.carrier)}</td><td>{editCell(i, 'yardLn', play.yardLn)}</td><td className={num(play.gnls) >= 0 ? 'gain-positive' : 'gain-negative'}>{formatGnls(num(play.gnls))}</td><td>{editCell(i, 'result', play.result)}</td><td><button";
const newCells = "<td>{editCell(i, 'odk', play.odk, ['O', 'D', 'K'])}</td><td>{editCell(i, 'dn', play.dn, ['1', '2', '3', '4'])}</td><td>{editCell(i, 'dist', play.dist)}</td><td>{editCell(i, 'yardLn', play.yardLn)}</td><td>{editCell(i, 'form', play.form)}</td><td>{editCell(i, 'offPlay', play.offPlay)}</td><td>{editCell(i, 'type', play.type, ['Run', 'Pass'])}</td><td>{editCell(i, 'carrier', play.carrier)}</td><td>{editCell(i, 'result', play.result)}</td><td>{editCell(i, 'defense', play.defense)}</td><td className={num(play.gnls) >= 0 ? 'gain-positive' : 'gain-negative'}>{formatGnls(num(play.gnls))}</td><td><button";
if (source.includes(oldCells)) source = source.replace(oldCells, newCells);

if (!source.includes("editableField('form', 'Formation')")) throw new Error('Could not install Live Game scouting-driven fields');
if (!source.includes('<th>Formation</th><th>Play Call</th><th>Play Type</th>')) throw new Error('Could not reorder Live Game spreadsheet columns');

fs.writeFileSync(appPath, source);
console.log(`Live Game Result vocabulary and editable scouting-driven inputs configured${occurrences ? ` (${occurrences} Result field lists updated)` : ''}.`);
