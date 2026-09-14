type Play = any;
function num(value: string) { const found = value.match(/-?\d+/); return found ? Number(found[0]) : 0; }
function normalizeYardLine(value: string): string {
  const normalized = value.trim().toUpperCase();
  const match = normalized.match(/^(OWN|OPP|OPPONENT|OUR|O|A)?\s*(-?\d{1,3})\b/);
  if (!match) return value.trim();
  const yard = Number(match[2]);
  if (Math.abs(yard) > 100) return value.trim();
  const side = match[1] ?? '';
  const signed = side === 'OWN' || side === 'OUR' || side === 'O' ? -Math.abs(yard) : side === 'OPP' || side === 'OPPONENT' || side === 'A' ? Math.abs(yard) : yard;
  return String(signed);
}
const SCOUT_ALL = 'ALL';
const UNCLASSIFIED_ZONE = 'UNCLASSIFIED';
const FIELD_ZONES = ['BACKED UP (Own 1-10)', 'OWN TERRITORY (Own 11-39)', 'MIDFIELD (Own 40 - Opp 40)', 'RED ZONE (Opp 11-39)', 'GOAL LINE (Opp 1-10)'];
const DISTANCE_BUCKETS = ['1-3 (SHORT)', '4-7 (MEDIUM)', '8+ (LONG)'];
const SUMMARY_COLUMNS = ['SNAPS', '% OF TOTAL', 'RUN %', 'PASS %', 'AVG YDS', 'SUCCESS %', 'TOP SCHEME', 'TOP RUN', 'TOP PASS', 'PRIMARY BACKFIELD'];
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
// Own-side yard lines are negative, opponent-side positive (see normalizeYardLine).
function classifyYardLine(value: string) {
  const normalized = normalizeYardLine(value);
  if (!/^-?\d{1,3}$/.test(normalized)) return UNCLASSIFIED_ZONE;
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
// Grouping is case-insensitive so sloppy entry ("DROP BACK" / "Drop Back") lands in one row.
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
// Verification driver: exercises the real ScoutPage helpers against live Supabase data.
declare const require: any;
const rows = JSON.parse(require('fs').readFileSync('../../sp.json', 'utf8'));
const plays: Play[] = rows.map((r: any) => ({
  playNo: String(r.play_no), odk: r.odk ?? 'O', dn: r.dn !== null ? String(r.dn) : '1',
  dist: r.dist !== null ? String(r.dist) : '10', hash: r.hash ?? 'M',
  gnls: r.gnls !== null ? String(r.gnls) : '0', carrier: '—',
  yardLn: r.yard_ln !== null ? String(r.yard_ln) : '—', type: r.play_type ?? 'RUN',
  result: '—', form: r.off_form ?? '—', personnel: r.personnel ?? '—', scheme: r.scheme ?? '—',
  defense: '—', motion: r.motion ?? 'None', offPlay: r.off_play ?? '—',
  dir: r.direction ?? '—', backfield: r.backfield ?? '—',
}));

const pctText = (v: number) => `${(v * 100).toFixed(1)}%`;
console.log(`plays loaded: ${plays.length}`);

const all = summarize(plays, plays.length);
console.log('\n== DASHBOARD metrics (ALL) ==');
console.log(`total ${all.count} | run ${pctText(all.runPct)} | pass ${pctText(all.passPct)} | avg ${all.avgGain.toFixed(1)} | success ${pctText(all.successRate)} | explosive ${pctText(all.explosiveRate)}`);
console.log(`top scheme ${all.topScheme} | top run ${all.topRun} | top pass ${all.topPass} | top backfield ${all.topBackfield}`);

// Cross-check success + explosive against an independent count.
let manualSuccess = 0, manualExpl = 0;
for (const p of plays) {
  const d = Number(p.dn), dist = Number(p.dist), g = Number(p.gnls);
  if (d === 1 ? g >= 4 : d === 2 ? g >= dist / 2 : d >= 3 ? g >= dist : g >= 4) manualSuccess++;
  if (g >= 12) manualExpl++;
}
console.log(`\ncross-check success: engine ${Math.round(all.successRate * plays.length)} vs manual ${manualSuccess}`);
console.log(`cross-check explosive: engine ${Math.round(all.explosiveRate * plays.length)} vs manual ${manualExpl}`);
console.log(`run+pass covers all snaps: ${plays.filter(scoutIsRun).length + plays.filter(scoutIsPass).length === plays.length}`);

console.log('\n== FIELD ZONE distribution ==');
let zoneTotal = 0;
for (const zone of [...FIELD_ZONES, UNCLASSIFIED_ZONE]) {
  const inZone = plays.filter(p => classifyYardLine(p.yardLn) === zone);
  zoneTotal += inZone.length;
  const s = summarize(inZone, plays.length);
  console.log(`${zone.padEnd(30)} ${String(s.count).padStart(3)}  run ${pctText(s.runPct).padStart(6)}  pass ${pctText(s.passPct).padStart(6)}  avg ${s.avgGain.toFixed(1)}`);
}
console.log(`zones account for every play: ${zoneTotal === plays.length}`);

console.log('\n== DOWN & DISTANCE ==');
let ddTotal = 0;
for (const sit of DOWN_DISTANCE_SITUATIONS) {
  const subset = plays.filter(sit.match);
  ddTotal += subset.length;
  const s = summarize(subset, plays.length);
  console.log(`${sit.label.padEnd(20)} ${String(s.count).padStart(3)}  run ${pctText(s.runPct).padStart(6)}  pass ${pctText(s.passPct).padStart(6)}  succ ${pctText(s.successRate).padStart(6)}`);
}
console.log(`situations are mutually exclusive & total: ${ddTotal} of ${plays.length}`);

console.log('\n== TOP FORMATIONS ==');
const forms = optionsFor(plays, (p: Play) => p.form).slice(1);
console.log(`${forms.length} distinct formations`);
forms.map(f => ({ f, s: summarize(plays.filter(p => scoutText(p.form) === f), plays.length) }))
  .sort((a, b) => b.s.count - a.s.count).slice(0, 6)
  .forEach(({ f, s }) => console.log(`${f.padEnd(14)} ${String(s.count).padStart(3)}  run ${pctText(s.runPct).padStart(6)}  topRun ${s.topRun.padEnd(12)} topPass ${s.topPass}`));

console.log('\n== CONCEPTS (top 6) ==');
const groups = new Map<string, Play[]>();
for (const p of plays) { const k = conceptKey(p); if (!isMeaningful(k)) continue; groups.set(scoutText(k), [...(groups.get(scoutText(k)) ?? []), p]); }
[...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 6).forEach(([k, ps]) => {
  const s = summarize(ps, plays.length);
  const runs = ps.filter(scoutIsRun).length;
  console.log(`${k.padEnd(16)} ${(runs >= ps.length - runs ? 'RUN' : 'PASS').padEnd(5)} ${String(s.count).padStart(3)}  ${pctText(s.pctTotal).padStart(6)}  avg ${s.avgGain.toFixed(1)}  eff ${pctText(s.successRate)}`);
});

console.log('\n== STRENGTH TAGS (str/wk sourced from dir + backfield) ==');
const tagged = (p: Play, t: string) => scoutText(p.dir).includes(t) || scoutText(p.backfield).includes(t);
console.log(`STR ${plays.filter(p => tagged(p, 'STR')).length} / WK ${plays.filter(p => tagged(p, 'WK')).length}  (dir-only would be ${plays.filter(p => scoutText(p.dir).includes('STR')).length}/${plays.filter(p => scoutText(p.dir).includes('WK')).length})`);

console.log('\n== MOTION ==');
const hasMotion = (p: Play) => { const m = scoutText(p.motion); return isMeaningful(m) && m !== 'NONE'; };
const wm = plays.filter(hasMotion), st = plays.filter(p => !hasMotion(p));
console.log(`with motion ${wm.length} (run ${pctText(wm.filter(scoutIsRun).length / (wm.length || 1))}) | static ${st.length} (run ${pctText(st.filter(scoutIsRun).length / (st.length || 1))})`);
