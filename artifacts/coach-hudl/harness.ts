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
