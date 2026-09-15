import fs from 'node:fs';

const appPath = new URL('../src/App.tsx', import.meta.url);
let source = fs.readFileSync(appPath, 'utf8');

if (!source.includes("const SCOUT_ALL")) {
  const marker = "type Play = StandardPlay;\n";
  if (!source.includes(marker)) throw new Error('Could not find Play type marker in App.tsx');
  source = source.replace(marker, `${marker}\nconst SCOUT_ALL = 'ALL';\n`);
  console.log('Added missing SCOUT_ALL constant.');
}

if (!source.includes('function optionsFor(')) {
  const marker = "const SCOUT_ALL = 'ALL';\n";
  if (!source.includes(marker)) throw new Error('Could not find SCOUT_ALL marker in App.tsx');

  const helperBlock = `

type ScoutView = 'dashboard' | 'formations' | 'detail' | 'multi' | 'pbp';
type ScoutSummary = {
  count: number;
  pctTotal: number;
  runPct: number;
  passPct: number;
  avgGain: number;
  successRate: number;
  explosiveRate: number;
  topScheme: string;
  topRun: string;
  topPass: string;
  topBackfield: string;
};
type ConceptRow = {
  name: string;
  type: 'RUN' | 'PASS';
  count: number;
  pctTotal: number;
  avgGain: number;
  successRate: number;
  explosiveRate: number;
};

const UNCLASSIFIED_ZONE = 'UNCLASSIFIED';
const FIELD_ZONES = ['BACKED UP (Own 1-10)', 'OWN TERRITORY (Own 11-39)', 'MIDFIELD (Own 40 - Opp 40)', 'RED ZONE (Opp 11-39)', 'GOAL LINE (Opp 1-10)'];
const DISTANCE_BUCKETS = ['1-3 (SHORT)', '4-7 (MEDIUM)', '8+ (LONG)'];
const SCOUT_VIEWS: { key: ScoutView; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Gauge },
  { key: 'formations', label: 'Formation report', icon: Layers },
  { key: 'detail', label: 'Formation detail', icon: Compass },
  { key: 'multi', label: 'Multi formation', icon: Split },
  { key: 'pbp', label: 'Play by play', icon: ClipboardList },
];
const DOWN_DISTANCE_SITUATIONS: { label: string; match: (play: Play) => boolean }[] = [
  { label: '1ST & 10+', match: p => num(p.dn) === 1 && num(p.dist) >= 10 },
  { label: '1ST & SHORT (1-9)', match: p => num(p.dn) === 1 && num(p.dist) < 10 },
  { label: '2ND & LONG (8+)', match: p => num(p.dn) === 2 && num(p.dist) >= 8 },
  { label: '2ND & MED (4-7)', match: p => num(p.dn) === 2 && num(p.dist) >= 4 && num(p.dist) <= 7 },
  { label: '2ND & SHORT (1-3)', match: p => num(p.dn) === 2 && num(p.dist) <= 3 },
  { label: '3RD & LONG (7+)', match: p => num(p.dn) === 3 && num(p.dist) >= 7 },
  { label: '3RD & MED (3-6)', match: p => num(p.dn) === 3 && num(p.dist) >= 3 && num(p.dist) <= 6 },
  { label: '3RD & SHORT / 4TH', match: p => (num(p.dn) === 3 && num(p.dist) <= 2) || num(p.dn) === 4 },
];

const scoutText = (value: string | undefined) => String(value ?? '').trim().toUpperCase();
const scoutIsRun = (play: Play) => { const type = scoutText(play.type); return type.startsWith('RUN') || type === 'R'; };
const scoutIsPass = (play: Play) => { const type = scoutText(play.type); return type.startsWith('PASS') || type === 'P'; };
const scoutIsExplosive = (play: Play) => num(play.gnls) >= 12;
function scoutIsSuccess(play: Play) {
  const down = num(play.dn); const dist = num(play.dist); const gain = num(play.gnls);
  if (down === 1) return gain >= 4;
  if (down === 2) return gain >= dist / 2;
  if (down >= 3) return gain >= dist;
  return gain >= 4;
}
function distanceBucket(dist: number) {
  if (dist >= 1 && dist <= 3) return DISTANCE_BUCKETS[0];
  if (dist >= 4 && dist <= 7) return DISTANCE_BUCKETS[1];
  return dist >= 8 ? DISTANCE_BUCKETS[2] : '';
}
function classifyYardLine(value: string) {
  const normalized = normalizeYardLine(value);
  if (!/^-?\\d{1,3}$/.test(normalized)) return UNCLASSIFIED_ZONE;
  const yard = Number(normalized);
  if (Math.abs(yard) > 100) return UNCLASSIFIED_ZONE;
  if (yard < 0) { const own = Math.abs(yard); return own <= 10 ? FIELD_ZONES[0] : own <= 39 ? FIELD_ZONES[1] : FIELD_ZONES[2]; }
  if (yard === 0) return FIELD_ZONES[2];
  return yard <= 10 ? FIELD_ZONES[4] : yard <= 39 ? FIELD_ZONES[3] : FIELD_ZONES[2];
}
function isMeaningful(value: string) {
  const upper = scoutText(value);
  return Boolean(upper) && upper !== '—' && upper !== '-' && upper !== '0' && upper !== 'UNSPECIFIED' && !upper.includes('SELECT');
}
function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const raw of values) { const value = scoutText(raw); if (!isMeaningful(value)) continue; counts.set(value, (counts.get(value) ?? 0) + 1); }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
const topValue = (values: string[]) => countBy(values)[0]?.[0] ?? '—';
const topValues = (values: string[], take: number) => countBy(values).slice(0, take).map(entry => entry[0]).join(', ') || '—';
function summarize(plays: Play[], base: number): ScoutSummary {
  const count = plays.length;
  const runs = plays.filter(scoutIsRun);
  const passes = plays.filter(scoutIsPass);
  return {
    count,
    pctTotal: base ? count / base : 0,
    runPct: count ? runs.length / count : 0,
    passPct: count ? passes.length / count : 0,
    avgGain: count ? plays.reduce((sum, play) => sum + num(play.gnls), 0) / count : 0,
    successRate: count ? plays.filter(scoutIsSuccess).length / count : 0,
    explosiveRate: count ? plays.filter(scoutIsExplosive).length / count : 0,
    topScheme: topValue(plays.map(play => play.scheme)),
    topRun: topValue(runs.map(play => play.offPlay)),
    topPass: topValue(passes.map(play => play.offPlay)),
    topBackfield: topValue(plays.map(play => play.backfield)),
  };
}
function optionsFor(plays: Play[], pick: (play: Play) => string) {
  const values = new Set<string>();
  for (const play of plays) { const value = scoutText(pick(play)); if (isMeaningful(value)) values.add(value); }
  return [SCOUT_ALL, ...[...values].sort((a, b) => a.localeCompare(b))];
}
const pctText = (value: number) => `${(value * 100).toFixed(1)}%`;
const roundPct = (value: number) => Math.round(value * 100);
const decText = (value: number) => value.toFixed(1);
const matchesAll = (filter: string) => !filter || filter === SCOUT_ALL;
const conceptKey = (play: Play) => { const call = String(play.offPlay ?? '').trim(); return isMeaningful(call) ? call : String(play.scheme ?? '').trim(); };
const RUN_CELL: CSSProperties = { background: 'rgba(98,223,174,.12)', fontWeight: 700 };
const PASS_CELL: CSSProperties = { background: 'rgba(232,200,134,.12)', fontWeight: 700 };

function ScoutFilter({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <div className="field"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={event => onChange(event.target.value)} data-testid={id}>{options.map(option => <option key={option} value={option}>{option}</option>)}</select></div>;
}

function SummaryTable({ label, rows, testId }: { label: string; rows: Array<{ name: string; summary: ScoutSummary }>; testId: string }) {
  return <div className="table-wrap"><table className="data-table" data-testid={testId}><thead><tr><th>{label}</th><th>Snaps</th><th>% of total</th><th>Run %</th><th>Pass %</th><th>Avg yds</th><th>Success %</th><th>Top scheme</th><th>Top run</th><th>Top pass</th><th>Backfield</th></tr></thead><tbody>{rows.map(row => <tr key={row.name}><td><strong>{row.name}</strong></td><td>{row.summary.count}</td><td>{pctText(row.summary.pctTotal)}</td><td style={row.summary.runPct >= .7 ? RUN_CELL : undefined}>{pctText(row.summary.runPct)}</td><td style={row.summary.passPct >= .7 ? PASS_CELL : undefined}>{pctText(row.summary.passPct)}</td><td>{decText(row.summary.avgGain)}</td><td>{pctText(row.summary.successRate)}</td><td>{row.summary.topScheme}</td><td>{row.summary.topRun}</td><td>{row.summary.topPass}</td><td>{row.summary.topBackfield}</td></tr>)}</tbody></table></div>;
}

function ScoutVerdict({ verdict, tone }: { verdict: string; tone: 'run' | 'pass' | 'balanced' | 'none' }) {
  const className = tone === 'run' ? 'green' : tone === 'pass' ? 'gold' : '';
  return <Panel><div className={`callout ${className}`}><Target /><strong>{verdict}</strong></div></Panel>;
}
`;

  source = source.replace(marker, `${marker}${helperBlock}`);
  console.log('Restored missing Scout helper definitions.');
}

if (!source.includes('activeTeam?: string;')) {
  const marker = '  activeGameId: string;\n';
  if (!source.includes(marker)) throw new Error('Could not find Dataset activeGameId marker in App.tsx');
  source = source.replace(marker, `${marker}  activeTeam?: string;\n`);
  console.log('Added Dataset activeTeam type.');
}

fs.writeFileSync(appPath, source);
