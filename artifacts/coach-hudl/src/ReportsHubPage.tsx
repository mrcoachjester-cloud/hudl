import { useMemo, useState } from 'react';
import { BarChart3, Download, Shield, TrendingUp, Users, Zap } from 'lucide-react';
import type { StandardPlay } from './lib/footballData';

export type ReportsDataset = {
  scouting: StandardPlay[];
  live: StandardPlay[];
};

type Props = { data: ReportsDataset };

type StatRow = { name: string; att: number; yds: number; td: number; fum: number };

const n = (value: string) => {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
};
const pct = (a: number, b: number) => b ? `${Math.round((a / b) * 100)}%` : '—';
const avg = (yds: number, att: number) => att ? (yds / att).toFixed(1) : '0.0';
const odk = (value: string) => {
  const v = value.trim().toLowerCase();
  if (v === 'o' || v.includes('off')) return 'O';
  if (v === 'd' || v.includes('def')) return 'D';
  if (v === 'k' || v.includes('kick')) return 'K';
  return value.trim().toUpperCase();
};
const isRun = (p: StandardPlay) => p.type.toLowerCase().includes('run');
const isPass = (p: StandardPlay) => p.type.toLowerCase().includes('pass');
const gain = (p: StandardPlay) => n(p.gnls);
const result = (p: StandardPlay) => p.result.toLowerCase();
const isTD = (p: StandardPlay) => /touchdown|\btd\b/.test(result(p));
const isFumble = (p: StandardPlay) => /fumble/.test(result(p));
const isInterception = (p: StandardPlay) => /interception|\bint\b/.test(result(p));
const isSack = (p: StandardPlay) => /sack/.test(result(p));
const isComplete = (p: StandardPlay) => /complete/.test(result(p)) && !/incomplete/.test(result(p));
const explosiveRun = (p: StandardPlay) => isRun(p) && gain(p) >= 10;
const explosivePass = (p: StandardPlay) => isPass(p) && gain(p) >= 15;

function section(title: string, detail?: string) {
  return <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 15 }}><div><div className="eyebrow">{title}</div>{detail && <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 3 }}>{detail}</div>}</div></div>;
}

function Kpi({ label, value, note, green }: { label: string; value: string; note?: string; green?: boolean }) {
  return <div className="kpi"><span>{label}</span><strong style={green ? { color: '#62dfae' } : undefined}>{value}</strong>{note && <small>{note}</small>}</div>;
}

function tableEmpty(message: string) {
  return <div className="empty" style={{ padding: 22 }}><BarChart3 size={24} /><p style={{ margin: 0 }}>{message}</p></div>;
}

function playerStats(plays: StandardPlay[]): StatRow[] {
  const by = new Map<string, StatRow>();
  for (const p of plays) {
    const name = p.carrier.trim();
    if (!name) continue;
    const row = by.get(name) ?? { name, att: 0, yds: 0, td: 0, fum: 0 };
    if (isRun(p)) { row.att += 1; row.yds += gain(p); }
    if (isTD(p) && isRun(p)) row.td += 1;
    if (isFumble(p)) row.fum += 1;
    by.set(name, row);
  }
  return [...by.values()].filter(r => r.att > 0).sort((a, b) => b.yds - a.yds || b.att - a.att);
}

function receivingStats(plays: StandardPlay[]): StatRow[] {
  const by = new Map<string, StatRow>();
  for (const p of plays) {
    const name = p.carrier.trim();
    if (!name || !isPass(p) || !isComplete(p)) continue;
    const row = by.get(name) ?? { name, att: 0, yds: 0, td: 0, fum: 0 };
    row.att += 1; row.yds += gain(p); if (isTD(p)) row.td += 1; if (isFumble(p)) row.fum += 1;
    by.set(name, row);
  }
  return [...by.values()].sort((a, b) => b.yds - a.yds || b.att - a.att);
}

function TeamOffenseStats({ plays }: { plays: StandardPlay[] }) {
  const runs = plays.filter(isRun);
  const passes = plays.filter(isPass);
  const rushingYds = runs.reduce((s, p) => s + gain(p), 0);
  const passAttempts = passes.filter(p => /complete|incomplete|interception|sack/.test(result(p))).length;
  const completions = passes.filter(isComplete).length;
  const passYds = passes.filter(isComplete).reduce((s, p) => s + gain(p), 0);
  const rushTD = runs.filter(isTD).length;
  const passTD = passes.filter(isTD).length;
  const sacks = passes.filter(isSack).length;
  const rushers = playerStats(plays);
  const receivers = receivingStats(plays);
  const totalYds = rushingYds + passYds;
  return <div className="grid split-grid">
    <Panel title="TEAM OFFENSE">
      {section('TEAM OFFENSE', 'Live ODK = O · box-score totals')}
      <div className="grid kpi-grid" style={{ marginBottom: 18 }}>
        <Kpi label="Total offense" value={String(totalYds)} note="yards" green />
        <Kpi label="Plays" value={String(plays.length)} note={`${pct(runs.length, plays.length)} run`} />
        <Kpi label="Rush yards" value={String(rushingYds)} note={`${runs.length} attempts`} />
        <Kpi label="Pass yards" value={String(passYds)} note={`${completions}/${passAttempts}`} />
      </div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Category</th><th>Att</th><th>Yds</th><th>Avg</th><th>TD</th></tr></thead><tbody>
        <tr><td><strong>Rushing</strong></td><td>{runs.length}</td><td>{rushingYds}</td><td>{avg(rushingYds, runs.length)}</td><td>{rushTD}</td></tr>
        <tr><td><strong>Passing</strong></td><td>{completions}/{passAttempts}</td><td>{passYds}</td><td>{avg(passYds, completions)}</td><td>{passTD}</td></tr>
        <tr><td><strong>Total Offense</strong></td><td>{plays.length}</td><td>{totalYds}</td><td>{avg(totalYds, plays.length)}</td><td>{rushTD + passTD}</td></tr>
      </tbody></table></div>
      <div className="eyebrow" style={{ marginTop: 12 }}>Sacks: {sacks} · Turnovers: {passes.filter(isInterception).length + plays.filter(isFumble).length}</div>
    </Panel>
    <Panel title="RUSHING / RECEIVING">
      {section('RUSHING', 'Ball-carrier production')}
      {rushers.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Player</th><th>Car</th><th>Yds</th><th>Avg</th><th>TD</th><th>Fum</th></tr></thead><tbody>{rushers.map(r => <tr key={r.name}><td><strong>{r.name}</strong></td><td>{r.att}</td><td>{r.yds}</td><td>{avg(r.yds, r.att)}</td><td>{r.td}</td><td>{r.fum}</td></tr>)}</tbody></table></div> : tableEmpty('No rushing player data yet.')}
      <div style={{ height: 22 }} />
      {section('RECEIVING', 'Completed passes by carrier')}
      {receivers.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Player</th><th>Rec</th><th>Yds</th><th>Avg</th><th>TD</th></tr></thead><tbody>{receivers.map(r => <tr key={r.name}><td><strong>{r.name}</strong></td><td>{r.att}</td><td>{r.yds}</td><td>{avg(r.yds, r.att)}</td><td>{r.td}</td></tr>)}</tbody></table></div> : tableEmpty('No completed passes yet.')}
    </Panel>
  </div>;
}

function OffAnalysis({ plays }: { plays: StandardPlay[] }) {
  const runs = plays.filter(isRun), passes = plays.filter(isPass);
  const formations = [...new Set(plays.map(p => p.form).filter(Boolean))].map(form => {
    const rows = plays.filter(p => p.form === form); const r = rows.filter(isRun).length, pa = rows.filter(isPass).length;
    return { form, count: rows.length, runPct: Math.round(r / rows.length * 100), passPct: Math.round(pa / rows.length * 100), top: [...new Set(rows.map(p => p.offPlay).filter(Boolean))].map(call => ({ call, count: rows.filter(p => p.offPlay === call).length })).sort((a,b)=>b.count-a.count)[0] };
  }).sort((a,b)=>b.count-a.count).slice(0, 8);
  const playStats = (type: 'run' | 'pass') => [...new Set(plays.filter(type === 'run' ? isRun : isPass).map(p => p.offPlay).filter(Boolean))].map(call => { const rows = plays.filter(p => p.offPlay === call && (type === 'run' ? isRun(p) : isPass(p))); const y = rows.reduce((s,p)=>s+gain(p),0); return { call, count: rows.length, yds: y, avg: avg(y, rows.length), explosive: rows.filter(type === 'run' ? explosiveRun : explosivePass).length }; }).sort((a,b)=>b.count-a.count || b.yds-a.yds).slice(0, 10);
  const situations = ['1st & long','2nd & long','2nd & medium','2nd & short','3rd & long','3rd & medium','3rd & short'];
  const sit = (p: StandardPlay) => { const d=n(p.dn), dist=n(p.dist); if(d===1)return '1st & long'; return `${d===2?'2nd':'3rd'} & ${dist>=7?'long':dist>=4?'medium':'short'}`; };
  return <div className="grid">
    <Panel>{section('OFFENSE IDENTITY', 'Live Game · only ODK = O')}<div className="grid kpi-grid"><Kpi label="Offensive plays" value={String(plays.length)} /><Kpi label="Run / Pass" value={`${pct(runs.length, plays.length)} / ${pct(passes.length, plays.length)}`} /><Kpi label="X-Run" value={String(runs.filter(explosiveRun).length)} note="10+ yards" green /><Kpi label="X-Pass" value={String(passes.filter(explosivePass).length)} note="15+ yards" green /></div></Panel>
    <Panel>{section('TOP FORMATIONS', 'Usage and identity')}{formations.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Formation</th><th>Snaps</th><th>R%</th><th>P%</th><th>Favorite call</th></tr></thead><tbody>{formations.map(f=><tr key={f.form}><td><strong>{f.form}</strong></td><td>{f.count}</td><td>{f.runPct}%</td><td>{f.passPct}%</td><td>{f.top?.call ?? '—'} <span className="eyebrow">({f.top?.count ?? 0})</span></td></tr>)}</tbody></table></div>:tableEmpty('No offensive formations yet.')}</Panel>
    <div className="grid split-grid"><Panel>{section('TOP RUN PLAYS', 'Calls · average gain · explosives')}{playStats('run').length?<div className="table-wrap"><table className="data-table"><thead><tr><th>Play</th><th>Calls</th><th>Avg</th><th>X</th></tr></thead><tbody>{playStats('run').map(p=><tr key={p.call}><td><strong>{p.call}</strong></td><td>{p.count}</td><td>{p.avg}</td><td>{p.explosive}</td></tr>)}</tbody></table></div>:tableEmpty('No run calls yet.')}</Panel><Panel>{section('TOP PASS PLAYS', 'Calls · average gain · explosives')}{playStats('pass').length?<div className="table-wrap"><table className="data-table"><thead><tr><th>Play</th><th>Calls</th><th>Avg</th><th>X</th></tr></thead><tbody>{playStats('pass').map(p=><tr key={p.call}><td><strong>{p.call}</strong></td><td>{p.count}</td><td>{p.avg}</td><td>{p.explosive}</td></tr>)}</tbody></table></div>:tableEmpty('No pass calls yet.')}</Panel></div>
    <Panel>{section('DOWN & DISTANCE', 'Live offensive tendency by situation')}<div className="table-wrap"><table className="data-table"><thead><tr><th>Situation</th><th>Plays</th><th>R/P</th><th>Avg</th><th>Top call</th></tr></thead><tbody>{situations.map(label=>{const rows=plays.filter(p=>sit(p)===label);const r=rows.filter(isRun).length;const y=rows.reduce((s,p)=>s+gain(p),0);const calls=[...new Set(rows.map(p=>p.offPlay).filter(Boolean))].map(call=>({call,count:rows.filter(p=>p.offPlay===call).length})).sort((a,b)=>b.count-a.count)[0];return <tr key={label}><td><strong>{label}</strong></td><td>{rows.length}</td><td>{rows.length?`${pct(r,rows.length)} / ${pct(rows.length-r,rows.length)}`:'—'}</td><td>{avg(y,rows.length)}</td><td>{calls?.call??'—'}</td></tr>})}</tbody></table></div></Panel>
    <div className="grid split-grid"><Panel>{section('EXPLOSIVE PLAYS', '10+ rush · 15+ pass')}{[...plays.filter(p=>explosiveRun(p)||explosivePass(p))].sort((a,b)=>gain(b)-gain(a)).slice(0,10).length?<div className="table-wrap"><table className="data-table"><thead><tr><th>Play</th><th>Type</th><th>Gain</th><th>Formation</th></tr></thead><tbody>{plays.filter(p=>explosiveRun(p)||explosivePass(p)).sort((a,b)=>gain(b)-gain(a)).slice(0,10).map(p=><tr key={p.playNo}><td>#{p.playNo} · <strong>{p.offPlay}</strong></td><td>{p.type}</td><td className="gain-positive">+{gain(p)}</td><td>{p.form}</td></tr>)}</tbody></table></div>:tableEmpty('No explosive plays yet.')}</Panel><Panel>{section('FIELD POSITION', 'Red-zone and field-zone snapshot')}<div className="feed"><div className="feed-row"><span className="feed-num">RZ</span><div className="feed-main"><strong>{plays.filter(p=>/opp\s*(?:[1-9]|1\d|2[0-5])\b/i.test(p.yardLn)).length}</strong><span>snaps inside opponent 25</span></div></div><div className="feed-row"><span className="feed-num">3D</span><div className="feed-main"><strong>{plays.filter(p=>n(p.dn)===3).length}</strong><span>third-down snaps</span></div></div><div className="feed-row"><span className="feed-num">TD</span><div className="feed-main"><strong>{plays.filter(isTD).length}</strong><span>offensive touchdowns charted</span></div></div></div></Panel></div>
  </div>;
}

function DefAnalysis({ scouting, live }: { scouting: StandardPlay[]; live: StandardPlay[] }) {
  const scout = scouting.filter(p=>odk(p.odk)==='D'), current = live.filter(p=>odk(p.odk)==='D');
  const runPass = (rows: StandardPlay[]) => { const r=rows.filter(isRun).length; return rows.length?`${pct(r,rows.length)} / ${pct(rows.length-r,rows.length)}`:'—'; };
  const formations = [...new Set([...scout,...current].map(p=>p.form).filter(Boolean))].map(form=>{const s=scout.filter(p=>p.form===form),l=current.filter(p=>p.form===form);return {form,scout:s.length,live:l.length,scoutRP:runPass(s),liveRP:runPass(l),change:l.length-s.length};}).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)).slice(0,10);
  const situations = ['1st & long','2nd & long','2nd & medium','2nd & short','3rd & long','3rd & medium','3rd & short'];
  const sit=(p:StandardPlay)=>{const d=n(p.dn),dist=n(p.dist);if(d===1)return '1st & long';return `${d===2?'2nd':'3rd'} & ${dist>=7?'long':dist>=4?'medium':'short'}`;};
  const compare=(rows:StandardPlay[])=>{const y=rows.reduce((s,p)=>s+gain(p),0);return {plays:rows.length,run:rows.filter(isRun).length,yards:y,avg:avg(y,rows.length),x:rows.filter(p=>gain(p)>=10).length};};
  const s=compare(scout),l=compare(current);
  return <div className="grid">
    <Panel>{section('DEF ANALYSIS', 'Scouting baseline vs live game · D entries only')}<div className="comparison"><div className="compare-col"><div className="compare-head"><strong>SCOUTING</strong><span className="tag">baseline</span></div><div className="compare-stat"><span>Snaps</span><b>{s.plays}</b></div><div className="compare-stat"><span>Run / pass</span><b>{runPass(scout)}</b></div><div className="compare-stat"><span>Avg gain allowed</span><b>{s.avg}</b></div><div className="compare-stat"><span>Explosives allowed</span><b>{s.x}</b></div></div><div className="compare-col"><div className="compare-head"><strong>LIVE</strong><span className="tag green">today</span></div><div className="compare-stat"><span>Snaps</span><b>{l.plays}</b></div><div className="compare-stat"><span>Run / pass</span><b>{runPass(current)}</b></div><div className="compare-stat"><span>Avg gain allowed</span><b>{l.avg}</b></div><div className="compare-stat"><span>Explosives allowed</span><b>{l.x}</b></div></div></div></Panel>
    <Panel>{section('RUN / PASS BY SITUATION', 'Scouting / live comparison')}<div className="table-wrap"><table className="data-table"><thead><tr><th>Situation</th><th>Scout R/P</th><th>Live R/P</th><th>Live snaps</th></tr></thead><tbody>{situations.map(label=>{const a=scout.filter(p=>sit(p)===label),b=current.filter(p=>sit(p)===label);return <tr key={label}><td><strong>{label}</strong></td><td>{runPass(a)}</td><td>{runPass(b)}</td><td>{b.length}</td></tr>})}</tbody></table></div></Panel>
    <Panel>{section('FORMATION COMPARISON', 'What changed from the scouting report')}<div className="table-wrap"><table className="data-table"><thead><tr><th>Formation</th><th>Scout</th><th>Live</th><th>Scout R/P</th><th>Live R/P</th><th>Δ snaps</th></tr></thead><tbody>{formations.map(f=><tr key={f.form}><td><strong>{f.form}</strong></td><td>{f.scout}</td><td>{f.live}</td><td>{f.scoutRP}</td><td>{f.liveRP}</td><td className={f.change>0?'gain-positive':f.change<0?'gain-negative':''}>{f.change>0?`+${f.change}`:f.change}</td></tr>)}</tbody></table></div></Panel>
    <Panel>{section('DEFENSIVE TAKEAWAYS', 'Immediate game-plan signals')}<div className="grid kpi-grid"><Kpi label="Yards allowed" value={String(l.yards)} /><Kpi label="Rush yards" value={String(current.filter(isRun).reduce((a,p)=>a+gain(p),0))} /><Kpi label="Pass yards" value={String(current.filter(isPass).filter(isComplete).reduce((a,p)=>a+gain(p),0))} /><Kpi label="Takeaways" value={String(current.filter(p=>isInterception(p)||isFumble(p)).length)} green /></div></Panel>
  </div>;
}

function DefenseTeamTotals({ plays }: { plays: StandardPlay[] }) {
  const runs=plays.filter(isRun), passes=plays.filter(isPass), rushYds=runs.reduce((s,p)=>s+gain(p),0), completed=passes.filter(isComplete), passYds=completed.reduce((s,p)=>s+gain(p),0), attempts=passes.filter(p=>/complete|incomplete|interception|sack/.test(result(p))).length;
  return <Panel>{section('DEFENSE TEAM TOTALS', 'Opponent offense from live D entries')}<div className="grid kpi-grid" style={{marginBottom:18}}><Kpi label="Total yards allowed" value={String(rushYds+passYds)} /><Kpi label="Rush allowed" value={String(rushYds)} note={`${runs.length} carries`} /><Kpi label="Pass allowed" value={String(passYds)} note={`${completed.length}/${attempts}`} /><Kpi label="Takeaways" value={String(plays.filter(p=>isInterception(p)||isFumble(p)).length)} green /></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Category</th><th>Att</th><th>Yds</th><th>Avg</th><th>TD</th></tr></thead><tbody><tr><td><strong>Rushing allowed</strong></td><td>{runs.length}</td><td>{rushYds}</td><td>{avg(rushYds,runs.length)}</td><td>{runs.filter(isTD).length}</td></tr><tr><td><strong>Passing allowed</strong></td><td>{completed.length}/{attempts}</td><td>{passYds}</td><td>{avg(passYds,completed.length)}</td><td>{passes.filter(isTD).length}</td></tr><tr><td><strong>Total</strong></td><td>{plays.length}</td><td>{rushYds+passYds}</td><td>{avg(rushYds+passYds,plays.length)}</td><td>{plays.filter(isTD).length}</td></tr></tbody></table></div><div className="eyebrow" style={{marginTop:12}}>Sacks: {passes.filter(isSack).length} · INT: {plays.filter(isInterception).length} · Fumbles: {plays.filter(isFumble).length}</div></Panel>;
}

export default function ReportsHubPage({ data }: Props) {
  const [active, setActive] = useState<'offense'|'defense'>('offense');
  const offense = useMemo(()=>data.live.filter(p=>odk(p.odk)==='O'),[data.live]);
  const defense = useMemo(()=>data.live.filter(p=>odk(p.odk)==='D'),[data.live]);
  const exportCsv=()=>{const rows=active==='offense'?offense:defense;const header=['Play #','ODK','Down','Distance','Hash','Yard Line','Play Type','Result','GN/LS','Ball Carrier','Personnel','Off Form','Backfield','Motion','Scheme','Off Play','Play Dir','Defense'];const cell=(v:string)=>`"${String(v??'').replaceAll('"','""')}"`;const body=rows.map(p=>[p.playNo,p.odk,p.dn,p.dist,p.hash,p.yardLn,p.type,p.result,p.gnls,p.carrier,p.personnel,p.form,p.backfield,p.motion,p.scheme,p.offPlay,p.dir,p.defense].map(cell).join(','));const blob=new Blob([[header.map(cell).join(','),...body].join('\r\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`coach-hudl-live-${active}-report.csv`;a.click();URL.revokeObjectURL(a.href);};
  return <div className="content"><PageHead eyebrow="Reports · live box score & analysis" title="Game stats that update with every snap." description="Live Game is the source of truth: O entries drive offense, D entries drive defensive analysis and team totals. Scouting remains the comparison baseline." actions={<button className="btn btn-primary" onClick={exportCsv} data-testid="button-export-report"><Download /> Export {active} CSV</button>} />
    <div className="filters report-tabs"><button className={`btn ${active==='offense'?'btn-green':'btn-ghost'}`} onClick={()=>setActive('offense')} data-testid="button-report-live-offense"><Zap /> OFFENSE</button><button className={`btn ${active==='defense'?'btn-primary':'btn-ghost'}`} onClick={()=>setActive('defense')} data-testid="button-report-defense"><Shield /> DEFENSE</button><span className="eyebrow">{active==='offense'?offense.length:defense.length} live snaps in view</span></div>
    {active==='offense'?<><TeamOffenseStats plays={offense}/><OffAnalysis plays={offense}/></>:<><DefAnalysis scouting={data.scouting} live={data.live}/><DefenseTeamTotals plays={defense}/></>}
  </div>;
}

function Panel({ children, title }: { children: React.ReactNode; title?: string }) {
  return <div className="panel">{children}</div>;
}

function PageHead({ eyebrow, title, description, actions }: { eyebrow:string; title:string; description:string; actions?:React.ReactNode }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{actions&&<div className="page-actions">{actions}</div>}</div>;
}
